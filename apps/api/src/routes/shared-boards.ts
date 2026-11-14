import { upgradeWebSocket } from "@hono/bun";
import {
  BOARD_NOTE_LIMIT,
  BoardLinkNoteSchema,
  BoardNoteInputSchema,
  REPORTS_TO_HIDE,
  ShareTokenSchema,
} from "@sharencare/shared";
import { and, asc, count, eq, isNull } from "drizzle-orm";
import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { db } from "../db";
import { boardNotes, boardReports, boards } from "../db/board-schema";
import { clientIp } from "../lib/client-ip";
import { reporterFingerprint } from "../lib/fingerprint";
import { announce, doneWriting, fromOwnSite, readLiveRequest, watch } from "../lib/live-boards";
import { validate } from "../lib/validate";
import { rateLimit } from "../middleware/rate-limit";
import { type AuthUser, optionalUser, requireUser } from "../middleware/require-user";

const boardNotHere = () => new HTTPException(404, { message: "This board isn't here" });
const noteNotFound = () => new HTTPException(404, { message: "Note not found" });
const firstName = (name: string) => name.split(" ")[0] ?? name;

const publicNote = {
  id: boardNotes.id,
  authorName: boardNotes.authorName,
  message: boardNotes.message,
  color: boardNotes.color,
  createdAt: boardNotes.createdAt,
};

async function findBoard(token: string) {
  const [board] = await db
    .select({ id: boards.id, closedAt: boards.closedAt })
    .from(boards)
    .where(eq(boards.token, token));
  if (!board) throw boardNotHere();
  return board;
}

export const sharedBoardsRoute = new Hono()
  .use(rateLimit)

  //anyone with the link can read. Signing in only adds "this note is yours".
  .get("/:token", optionalUser, validate("param", ShareTokenSchema), async (c) => {
    const viewer = c.get("user");
    const { token } = c.req.valid("param");
    const board = await db.query.boards.findFirst({
      where: eq(boards.token, token),
      columns: { id: true, title: true, recipient: true, closedAt: true },
      with: {
        owner: { columns: { name: true } },
        notes: {
          where: isNull(boardNotes.hiddenAt),
          orderBy: asc(boardNotes.createdAt),
          columns: {
            id: true,
            authorId: true,
            authorName: true,
            message: true,
            color: true,
            createdAt: true,
          },
        },
      },
    });
    if (!board) throw boardNotHere();

    //viewer's own note, even a hidden one, so the page can say what happened to it
    const [yourNote] = viewer
      ? await db
          .select({ id: boardNotes.id, hiddenAt: boardNotes.hiddenAt })
          .from(boardNotes)
          .where(and(eq(boardNotes.boardId, board.id), eq(boardNotes.authorId, viewer.id)))
      : [];

    return c.json({
      title: board.title,
      recipient: board.recipient,
      from: firstName(board.owner.name),
      open: board.closedAt === null,
      signedIn: viewer !== null,
      yourNote: yourNote ? { id: yourNote.id, hidden: yourNote.hiddenAt !== null } : null,
      notes: board.notes.map(({ authorId, ...note }) => ({
        ...note,
        mine: viewer !== null && authorId === viewer.id,
      })),
    });
  })
  //writing needs an account: one person, one note per board
  .post(
    "/:token/notes",
    requireUser,
    validate("param", ShareTokenSchema),
    validate("json", BoardNoteInputSchema),
    async (c) => {
      const user = c.get("user");
      const { token } = c.req.valid("param");
      const input = c.req.valid("json");
      const board = await findBoard(token);
      if (board.closedAt) throw new HTTPException(403, { message: "This board is closed" });

      const [{ notesSoFar } = { notesSoFar: 0 }] = await db
        .select({ notesSoFar: count() })
        .from(boardNotes)
        .where(eq(boardNotes.boardId, board.id));
      if (notesSoFar >= BOARD_NOTE_LIMIT) {
        throw new HTTPException(403, { message: "This board is full" });
      }

      const [note] = await db
        .insert(boardNotes)
        .values({
          ...input,
          boardId: board.id,
          authorId: user.id,
          authorName: firstName(user.name),
        })
        .onConflictDoNothing()
        .returning(publicNote);

      //no row came back. The one-note-per-person index refused it.
      if (!note) {
        throw new HTTPException(409, { message: "You already have a note on this board" });
      }
      doneWriting(board.id, user.id);
      announce(board.id);
      return c.json(note, 201);
    },
  )
  //only the person who wrote a note can delete it here. The owner has their own route.
  .delete(
    "/:token/notes/:noteId",
    requireUser,
    validate("param", BoardLinkNoteSchema),
    async (c) => {
      const user = c.get("user");
      const { token, noteId } = c.req.valid("param");
      const board = await findBoard(token);
      const [deleted] = await db
        .delete(boardNotes)
        .where(
          and(
            eq(boardNotes.id, noteId),
            eq(boardNotes.boardId, board.id),
            eq(boardNotes.authorId, user.id),
          ),
        )
        .returning({ id: boardNotes.id });
      if (!deleted) throw noteNotFound();
      announce(board.id);
      return c.json(deleted);
    },
  )
  //anyone with the link may report, signed in or not
  .post("/:token/notes/:noteId/report", validate("param", BoardLinkNoteSchema), async (c) => {
    const { token, noteId } = c.req.valid("param");
    const board = await findBoard(token);
    const [note] = await db
      .select({ id: boardNotes.id })
      .from(boardNotes)
      .where(and(eq(boardNotes.id, noteId), eq(boardNotes.boardId, board.id)));
    if (!note) throw noteNotFound();

    await db
      .insert(boardReports)
      .values({ noteId: note.id, reporterHash: reporterFingerprint(clientIp(c)) })
      .onConflictDoNothing();

    const [{ reports } = { reports: 0 }] = await db
      .select({ reports: count() })
      .from(boardReports)
      .where(eq(boardReports.noteId, note.id));
    if (reports >= REPORTS_TO_HIDE) {
      const [nowHidden] = await db
        .update(boardNotes)
        .set({ hiddenAt: new Date() })
        .where(and(eq(boardNotes.id, note.id), isNull(boardNotes.hiddenAt)))
        .returning({ id: boardNotes.id });

      if (nowHidden) announce(board.id);
    }

    return c.json({ reported: true });
    //return the same answer everytime, so nobody can learn how many reports a note has
  })

  //websocket......
  //the live line. the page opens it once and keeps it open
  .get(
    "/:token/live",
    optionalUser,
    validate("param", ShareTokenSchema),
    upgradeWebSocket(async (c) => {
      if (!fromOwnSite(c.req.header("origin"))) {
        throw new HTTPException(403, { message: "Live updates only work on shareNcare itself" });
      }

      const viewer: AuthUser | null = c.get("user");
      const board = await findBoard(c.req.param("token") ?? "");
      let line: ReturnType<typeof watch> | undefined;

      return {
        onOpen: (_event, socket) => {
          line = watch(
            board.id,
            socket,
            viewer && { id: viewer.id, firstName: firstName(viewer.name) },
          );
        },
        onMessage: (event) => {
          if (readLiveRequest(event.data)?.type === "writing") line?.writing();
        },
        onClose: () => line?.leave(),
      };
    }),
  );
