import { z } from "zod";
import { client, db } from "../src/db";
import { notes } from "../src/db/schema";

const MongoDate = z.object({ $date: z.iso.datetime() }).transform((d) => new Date(d.$date));

const MongoNote = z.object({
  title: z.string().min(1),
  description: z.string().min(1),
  createdAt: MongoDate,
  updatedAt: MongoDate,
});

const file = Bun.file(new URL("./notes.json", import.meta.url));

const mongoNotes = z.array(MongoNote).parse(await file.json());

const existing = await db.$count(notes);
if (existing > 0) {
  console.log(`⚠️ The notes table already has ${existing} rows. Nothing imported.`);
} else {
  const inserted = await db
    .insert(notes)
    .values(mongoNotes)
    .returning({ id: notes.id, title: notes.title });
  console.table(inserted);
}

await client.end();
