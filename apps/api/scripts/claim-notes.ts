import { eq, isNull } from "drizzle-orm";
import { z } from "zod";
import { client, db } from "../src/db";
import { notes, user } from "../src/db/schema";

const email = z.email("Usage: bun scripts/claim-notes.ts abhi45@example.com").parse(Bun.argv[2]);

const [owner] = await db.select().from(user).where(eq(user.email, email));

if (!owner) {
  console.log(`No account with the email ${email}. Sign up in the app first.`);
} else {
  const claimed = await db
    .update(notes)
    .set({ userId: owner.id })
    .where(isNull(notes.userId))
    .returning({ title: notes.title });
  console.log(`${claimed.length} note(s) now belong to ${owner.name}:`);
  console.table(claimed);
}

await client.end();
