import { NoteIdSchema, NoteInputSchema, NotePinSchema } from "@sharencare/shared";
import { and, desc, eq, isNotNull, isNull } from "drizzle-orm";
import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { db } from "../db";
import { notes } from "../db/schema";
import { validate } from "../lib/validate";
import { rateLimit } from "../middleware/rate-limit";

const noteNotFound = () => new HTTPException(404, { message: "Note not found" });

const notInTrash = isNull(notes.deletedAt);
const inTrash = isNotNull(notes.deletedAt);

export const notesRoute = new Hono()
  .use(rateLimit)
  .get("/", async (c) => {
    const activeNotes = await db
      .select()
      .from(notes)
      .where(notInTrash)
      .orderBy(desc(notes.pinned), desc(notes.createdAt));
    return c.json(activeNotes);
  })
  .get("/trash", async (c) => {
    const trashedNotes = await db
      .select()
      .from(notes)
      .where(inTrash)
      .orderBy(desc(notes.deletedAt));
    return c.json(trashedNotes);
  })
  .get("/:id", validate("param", NoteIdSchema), async (c) => {
    const { id } = c.req.valid("param");
    const [note] = await db
      .select()
      .from(notes)
      .where(and(eq(notes.id, id), notInTrash));
    if (!note) throw noteNotFound();
    return c.json(note);
  })
  .post("/", validate("json", NoteInputSchema), async (c) => {
    const input = c.req.valid("json");
    const [note] = await db.insert(notes).values(input).returning();
    if (!note) throw new Error("Insert returned no row");
    return c.json(note, 201);
  })
  .put("/:id", validate("param", NoteIdSchema), validate("json", NoteInputSchema), async (c) => {
    const { id } = c.req.valid("param");
    const input = c.req.valid("json");
    const [note] = await db
      .update(notes)
      .set(input)
      .where(and(eq(notes.id, id), notInTrash))
      .returning();
    if (!note) throw noteNotFound();
    return c.json(note);
  })
  .patch(
    "/:id/pin",
    validate("param", NoteIdSchema),
    validate("json", NotePinSchema),
    async (c) => {
      const { id } = c.req.valid("param");
      const { pinned } = c.req.valid("json");
      const [note] = await db
        .update(notes)
        .set({ pinned })
        .where(and(eq(notes.id, id), notInTrash))
        .returning();
      if (!note) throw noteNotFound();
      return c.json(note);
    },
  )
  //Soft delete
  .delete("/:id", validate("param", NoteIdSchema), async (c) => {
    const { id } = c.req.valid("param");
    const [trashed] = await db
      .update(notes)
      .set({ deletedAt: new Date() })
      .where(and(eq(notes.id, id), notInTrash))
      .returning({ id: notes.id });
    if (!trashed) throw noteNotFound();
    return c.json(trashed);
  })
  .post("/:id/restore", validate("param", NoteIdSchema), async (c) => {
    const { id } = c.req.valid("param");
    const [restored] = await db
      .update(notes)
      .set({ deletedAt: null })
      .where(and(eq(notes.id, id), inTrash))
      .returning();
    if (!restored) throw noteNotFound();
    return c.json(restored);
  })
  //Permanent delete
  .delete("/:id/permanent", validate("param", NoteIdSchema), async (c) => {
    const { id } = c.req.valid("param");
    const [deleted] = await db
      .delete(notes)
      .where(and(eq(notes.id, id), inTrash))
      .returning({ id: notes.id });
    if (!deleted) throw noteNotFound();
    return c.json(deleted);
  });
