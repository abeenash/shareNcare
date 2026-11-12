import {
  BoardIdSchema,
  BoardInputSchema,
  BoardNoteIdSchema,
  BoardOpenSchema,
  NoteHiddenSchema,
} from "@sharencare/shared";
import { and, asc, desc, eq } from "drizzle-orm";
import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { db } from "../db";
import { boardNotes, boardReports, boards } from "../db/board-schema";
import { newShareToken } from "../lib/share-token";
import { validate } from "../lib/validate";
import { rateLimit } from "../middleware/rate-limit";
import { requireUser } from "../middleware/require-user";

const boardNotFound = () => new HTTPException(404, { message: "Board not found" });
const noteNotFound = () => new HTTPException(404, { message: "Note not found" });

const ownedBy = (userId: string) => eq(boards.ownerId, userId);

async function findOwnedBoard(id: string, userId: string) {
  const [board] = await db
    .select({ id: boards.id })
    .from(boards)
    .where(and(eq(boards.id, id), ownedBy(userId)));
  if (!board) throw boardNotFound();
  return board;
}

export const boardsRoute = new Hono()
  .use(rateLimit)
  .use(requireUser)

  //first, get the board
  .get("/", async (c) => {
    const user = c.get("user");
    const mine = await db.query.boards.findMany({
      where: ownedBy(user.id),
      orderBy: desc(boards.createdAt),
      with: { notes: { columns: { id: true } } },
    });
    return c.json(mine.map(({ notes, ...board }) => ({ ...board, noteCount: notes.length })));
  })
  .post("/", validate("json", BoardInputSchema), async (c) => {
    const user = c.get("user");
    const input = c.req.valid("json");
    const [board] = await db
      .insert(boards)
      .values({ ...input, ownerId: user.id, token: newShareToken() })
      .returning();
    if (!board) throw new Error("Insert returned no row");
    return c.json(board, 201);
  })
  .get("/:id", validate("param", BoardIdSchema), async (c) => {
    const user = c.get("user");
    const { id } = c.req.valid("param");
    const board = await db.query.boards.findFirst({
      where: and(eq(boards.id, id), ownedBy(user.id)),
      with: {
        notes: {
          columns: { authorId: false },
          orderBy: asc(boardNotes.createdAt),
          with: { reports: { columns: { createdAt: true } } },
        },
      },
    });
    if (!board) throw boardNotFound();
    const notes = board.notes.map(({ reports, ...note }) => ({
      ...note,
      reportCount: reports.length,
    }));
    return c.json({ ...board, notes });
  })
  .patch("/:id", validate("param", BoardIdSchema), validate("json", BoardOpenSchema), async (c) => {
    const user = c.get("user");
    const { id } = c.req.valid("param");
    const { open } = c.req.valid("json");
    const [board] = await db
      .update(boards)
      .set({ closedAt: open ? null : new Date() })
      .where(and(eq(boards.id, id), ownedBy(user.id)))
      .returning();
    if (!board) throw boardNotFound();
    return c.json(board);
  })
  .post("/:id/new-link", validate("param", BoardIdSchema), async (c) => {
    const user = c.get("user");
    const { id } = c.req.valid("param");
    const [board] = await db
      .update(boards)
      .set({ token: newShareToken() })
      .where(and(eq(boards.id, id), ownedBy(user.id)))
      .returning();
    if (!board) throw boardNotFound();
    return c.json(board);
  })
  .delete("/:id", validate("param", BoardIdSchema), async (c) => {
    const user = c.get("user");
    const { id } = c.req.valid("param");
    const [deleted] = await db
      .delete(boards)
      .where(and(eq(boards.id, id), ownedBy(user.id)))
      .returning({ id: boards.id });
    if (!deleted) throw boardNotFound();
    return c.json(deleted);
  })
  //to hide a note, or bring it back. Bringing it back clears its reports
  .patch(
    "/:id/notes/:noteId",
    validate("param", BoardNoteIdSchema),
    validate("json", NoteHiddenSchema),
    async (c) => {
      const user = c.get("user");
      const { id, noteId } = c.req.valid("param");
      const { hidden } = c.req.valid("json");
      const board = await findOwnedBoard(id, user.id);

      const note = await db.transaction(async (tx) => {
        const [updated] = await tx
          .update(boardNotes)
          .set({ hiddenAt: hidden ? new Date() : null })
          .where(and(eq(boardNotes.id, noteId), eq(boardNotes.boardId, board.id)))
          .returning({ id: boardNotes.id, hiddenAt: boardNotes.hiddenAt });
        if (!updated) return null;

        if (!hidden) await tx.delete(boardReports).where(eq(boardReports.noteId, updated.id));
        return updated;
      });

      if (!note) throw noteNotFound();
      return c.json(note);
    },
  )
  .delete("/:id/notes/:noteId", validate("param", BoardNoteIdSchema), async (c) => {
    const user = c.get("user");
    const { id, noteId } = c.req.valid("param");
    const board = await findOwnedBoard(id, user.id);
    const [deleted] = await db
      .delete(boardNotes)
      .where(and(eq(boardNotes.id, noteId), eq(boardNotes.boardId, board.id)))
      .returning({ id: boardNotes.id });
    if (!deleted) throw noteNotFound();
    return c.json(deleted);
  });
