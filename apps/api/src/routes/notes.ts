import { NoteIdSchema, NoteInputSchema } from "@sharencare/shared";
import { desc, eq } from "drizzle-orm";
import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { db } from "../db";
import { notes } from "../db/schema";
import { validate } from "../lib/validate";
import { rateLimit } from "../middleware/rate-limit";

const noteNotFound = () => new HTTPException(404, { message: "Note not found" });

export const notesRoute = new Hono()
  .use(rateLimit)
  .get("/", async (c) => {
    const allNotes = await db.select().from(notes).orderBy(desc(notes.createdAt));
    return c.json(allNotes);
  })
  .get("/:id", validate("param", NoteIdSchema), async (c) => {
    const { id } = c.req.valid("param");
    const [note] = await db.select().from(notes).where(eq(notes.id, id));
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
    const [note] = await db.update(notes).set(input).where(eq(notes.id, id)).returning();
    if (!note) throw noteNotFound();
    return c.json(note);
  })
  .delete("/:id", validate("param", NoteIdSchema), async (c) => {
    const { id } = c.req.valid("param");
    const [deleted] = await db.delete(notes).where(eq(notes.id, id)).returning({ id: notes.id });
    if (!deleted) throw noteNotFound();
    return c.json(deleted);
  });
