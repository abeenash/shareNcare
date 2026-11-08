import {
  BOARD_NOTE_LIMIT,
  BoardLinkNoteSchema,
  BoardNoteInputSchema,
  GuestKeyHeaderSchema,
  REPORTS_TO_HIDE,
  ShareTokenSchema,
} from "@sharencare/shared";
import { and, asc, count, eq, isNull } from "drizzle-orm";
import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { db } from "../db";
import { boardNotes, boardReports, boards } from "../db/board-schema";
import { clientIp } from "../lib/client-ip";
import { hashGuestKey, newGuestKey, reporterFingerprint } from "../lib/guest-keys";
import { validate } from "../lib/validate";
import { limitBoardPosts, rateLimit } from "../middleware/rate-limit";

const boardNotHere = () => new HTTPException(404, { message: "This board isn't here" });
const noteNotFound = () => new HTTPException(404, { message: "Note not found" });

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
  .get("/:token", validate("param", ShareTokenSchema), async (c) => {
    const { token } = c.req.valid("param");
    const board = await db.query.boards.findFirst({
      where: eq(boards.token, token),
      columns: { title: true, recipient: true, closedAt: true },
      with: {
        owner: { columns: { name: true } },
        notes: {
          where: isNull(boardNotes.hiddenAt),
          orderBy: asc(boardNotes.createdAt),
          columns: { id: true, authorName: true, message: true, color: true, createdAt: true },
        },
      },
    });
    if (!board) throw boardNotHere();

    return c.json({
      title: board.title,
      recipient: board.recipient,
      from: board.owner.name.split(" ")[0] ?? board.owner.name,
      open: board.closedAt === null,
      notes: board.notes,
    });
  })
  .post(
    "/:token/notes",
    validate("param", ShareTokenSchema),
    validate("json", BoardNoteInputSchema),
    async (c) => {
      const { token } = c.req.valid("param");
      const input = c.req.valid("json");
      const board = await findBoard(token);
      if (board.closedAt) throw new HTTPException(403, { message: "This board is closed" });

      await limitBoardPosts(c, board.id);

      const [{ notesSoFar } = { notesSoFar: 0 }] = await db
        .select({ notesSoFar: count() })
        .from(boardNotes)
        .where(eq(boardNotes.boardId, board.id));
      if (notesSoFar >= BOARD_NOTE_LIMIT) {
        throw new HTTPException(403, { message: "This board is full" });
      }

      const guestKey = newGuestKey();
      const [note] = await db
        .insert(boardNotes)
        .values({ ...input, boardId: board.id, guestKeyHash: hashGuestKey(guestKey) })
        .returning(publicNote);
      if (!note) throw new Error("Insert returned no row");

      return c.json({ note, guestKey }, 201);
    },
  )
  .delete(
    "/:token/notes/:noteId",
    validate("param", BoardLinkNoteSchema),
    validate("header", GuestKeyHeaderSchema),
    async (c) => {
      const { token, noteId } = c.req.valid("param");
      const guestKey = c.req.valid("header")["x-guest-key"];
      const board = await findBoard(token);
      const [deleted] = await db
        .delete(boardNotes)
        .where(
          and(
            eq(boardNotes.id, noteId),
            eq(boardNotes.boardId, board.id),
            eq(boardNotes.guestKeyHash, hashGuestKey(guestKey)),
          ),
        )
        .returning({ id: boardNotes.id });
      if (!deleted) throw noteNotFound();
      return c.json(deleted);
    },
  )
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
      await db
        .update(boardNotes)
        .set({ hiddenAt: new Date() })
        .where(and(eq(boardNotes.id, note.id), isNull(boardNotes.hiddenAt)));
    }

    return c.json({ reported: true });
    //return the same answer everytime, so nobody can learn how many reports a note has
  });
