import {
  MAX_PHOTO_BYTES,
  NoteIdSchema,
  NoteInputSchema,
  NotePinSchema,
  PhotoAttachSchema,
  PhotoUploadRequestSchema,
  ShareOptionsSchema,
} from "@sharencare/shared";
import { and, desc, eq, isNotNull, isNull, sql } from "drizzle-orm";
import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { db } from "../db";
import { notes } from "../db/schema";
import { destroyNote, destroyNotes } from "../lib/destroy-notes";
import { photos } from "../lib/photos";
import { newShareToken } from "../lib/share-token";
import { validate } from "../lib/validate";
import { rateLimit } from "../middleware/rate-limit";
import { requireUser } from "../middleware/require-user";

const noteNotFound = () => new HTTPException(404, { message: "Note not found" });

const badPhoto = (message: string) => new HTTPException(400, { message });

const notInTrash = isNull(notes.deletedAt);
const inTrash = isNotNull(notes.deletedAt);
const notBurned = isNull(notes.burnedAt);

const ownedBy = (userId: string) => eq(notes.userId, userId);

export const notesRoute = new Hono()
  .use(rateLimit)
  .use(requireUser)
  .get("/", async (c) => {
    const user = c.get("user");
    const activeNotes = await db
      .select()
      .from(notes)
      .where(and(ownedBy(user.id), notInTrash))
      .orderBy(desc(notes.pinned), desc(notes.createdAt));
    return c.json(activeNotes);
  })
  .get("/trash", async (c) => {
    const user = c.get("user");
    const trashedNotes = await db
      .select()
      .from(notes)
      .where(and(ownedBy(user.id), inTrash))
      .orderBy(desc(notes.deletedAt));
    return c.json(trashedNotes);
  })
  .delete("/trash", async (c) => {
    const user = c.get("user");
    const mineInTrash = and(ownedBy(user.id), inTrash);
    const trashed = await db.select({ id: notes.id }).from(notes).where(mineInTrash);
    const result = await destroyNotes(
      trashed.map((note) => note.id),
      mineInTrash,
    );
    return c.json(result);
  })
  .get("/:id", validate("param", NoteIdSchema), async (c) => {
    const user = c.get("user");
    const { id } = c.req.valid("param");
    const [note] = await db
      .select()
      .from(notes)
      .where(and(eq(notes.id, id), ownedBy(user.id), notInTrash));
    if (!note) throw noteNotFound();
    return c.json(note);
  })
  .post("/", validate("json", NoteInputSchema), async (c) => {
    const user = c.get("user");
    const input = c.req.valid("json");
    const [note] = await db
      .insert(notes)
      .values({ ...input, userId: user.id })
      .returning();
    if (!note) throw new Error("Insert returned no row");
    return c.json(note, 201);
  })
  .put("/:id", validate("param", NoteIdSchema), validate("json", NoteInputSchema), async (c) => {
    const user = c.get("user");
    const { id } = c.req.valid("param");
    const input = c.req.valid("json");
    const [note] = await db
      .update(notes)
      .set(input)
      .where(and(eq(notes.id, id), ownedBy(user.id), notInTrash, notBurned))
      .returning();
    if (!note) throw noteNotFound();
    return c.json(note);
  })
  .patch(
    "/:id/pin",
    validate("param", NoteIdSchema),
    validate("json", NotePinSchema),
    async (c) => {
      const user = c.get("user");
      const { id } = c.req.valid("param");
      const { pinned } = c.req.valid("json");
      const [note] = await db
        .update(notes)
        .set({ pinned })
        .where(and(eq(notes.id, id), ownedBy(user.id), notInTrash))
        .returning();
      if (!note) throw noteNotFound();
      return c.json(note);
    },
  )
  //Soft delete
  .delete("/:id", validate("param", NoteIdSchema), async (c) => {
    const user = c.get("user");
    const { id } = c.req.valid("param");
    const [trashed] = await db
      .update(notes)
      .set({ deletedAt: new Date() })
      .where(and(eq(notes.id, id), ownedBy(user.id), notInTrash))
      .returning({ id: notes.id });
    if (!trashed) throw noteNotFound();
    return c.json(trashed);
  })
  .post("/:id/restore", validate("param", NoteIdSchema), async (c) => {
    const user = c.get("user");
    const { id } = c.req.valid("param");
    const [restored] = await db
      .update(notes)
      .set({ deletedAt: null })
      .where(and(eq(notes.id, id), ownedBy(user.id), inTrash))
      .returning();
    if (!restored) throw noteNotFound();
    return c.json(restored);
  })
  //Share note
  .post(
    "/:id/share",
    validate("param", NoteIdSchema),
    validate("json", ShareOptionsSchema),
    async (c) => {
      const user = c.get("user");
      const { id } = c.req.valid("param");
      const options = c.req.valid("json");
      const [note] = await db
        .update(notes)
        .set({ ...options, shareToken: sql`coalesce(${notes.shareToken},${newShareToken()})` })
        .where(and(eq(notes.id, id), ownedBy(user.id), notInTrash, notBurned))
        .returning();
      if (!note) throw noteNotFound();
      return c.json(note);
    },
  )
  //Delete the shared note
  .delete("/:id/share", validate("param", NoteIdSchema), async (c) => {
    const user = c.get("user");
    const { id } = c.req.valid("param");
    const [note] = await db
      .update(notes)
      .set({ shareToken: null, burnAfterReading: false, unsealAt: null })
      .where(and(eq(notes.id, id), ownedBy(user.id)))
      .returning();
    if (!note) throw noteNotFound();
    return c.json(note);
  })
  //Ask for a permission slip to upload a photo
  .post(
    "/:id/photo/upload-url",
    validate("param", NoteIdSchema),
    validate("json", PhotoUploadRequestSchema),
    async (c) => {
      const user = c.get("user");
      const { id } = c.req.valid("param");
      const [note] = await db
        .select({ id: notes.id })
        .from(notes)
        .where(and(eq(notes.id, id), ownedBy(user.id), notInTrash, notBurned));
      if (!note) throw noteNotFound();

      const key = `notes/${note.id}/${crypto.randomUUID()}`;
      return c.json({ key, uploadUrl: photos.uploadUrl(key) });
    },
  )
  //Check what arrived, then attach it to the note
  .put(
    "/:id/photo",
    validate("param", NoteIdSchema),
    validate("json", PhotoAttachSchema),
    async (c) => {
      const user = c.get("user");
      const { id } = c.req.valid("param");
      const { key } = c.req.valid("json");
      if (!key.startsWith(`notes/${id}/`)) throw badPhoto("That photo belongs to another letter");

      const [current] = await db
        .select({ photoKey: notes.photoKey })
        .from(notes)
        .where(and(eq(notes.id, id), ownedBy(user.id), notInTrash, notBurned));
      if (!current) throw noteNotFound();

      const arrived = await photos.inspect(key);
      if (!arrived) throw badPhoto("That photo never finished uploading");
      if (!arrived.isJpeg || arrived.size > MAX_PHOTO_BYTES) {
        await photos.remove(key);
        throw badPhoto("That file can't be used as a photo");
      }

      const [note] = await db
        .update(notes)
        .set({ photoKey: key })
        .where(eq(notes.id, id))
        .returning();
      if (!note) throw noteNotFound();

      if (current.photoKey) await photos.remove(current.photoKey);
      return c.json(note);
    },
  )
  .get("/:id/photo", validate("param", NoteIdSchema), async (c) => {
    const user = c.get("user");
    const { id } = c.req.valid("param");
    const [note] = await db
      .select({ photoKey: notes.photoKey })
      .from(notes)
      .where(and(eq(notes.id, id), ownedBy(user.id), notInTrash));
    if (!note?.photoKey) throw noteNotFound();
    return c.json({ url: photos.viewUrl(note.photoKey) });
  })
  .delete("/:id/photo", validate("param", NoteIdSchema), async (c) => {
    const user = c.get("user");
    const { id } = c.req.valid("param");
    const [note] = await db
      .update(notes)
      .set({ photoKey: null })
      .where(and(eq(notes.id, id), ownedBy(user.id), notInTrash, notBurned))
      .returning();
    if (!note) throw noteNotFound();
    await photos.removeAllFor(id);
    return c.json(note);
  })
  //Permanent delete
  .delete("/:id/permanent", validate("param", NoteIdSchema), async (c) => {
    const user = c.get("user");
    const { id } = c.req.valid("param");
    const destroyed = await destroyNote(id, and(ownedBy(user.id), inTrash));
    if (!destroyed) throw noteNotFound();
    return c.json({ id });
  });
