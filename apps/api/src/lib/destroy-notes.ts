import { and, eq, type SQL } from "drizzle-orm";
import { db } from "../db";
import { notes } from "../db/schema";
import { photos } from "./photos";

//one letter, all or nothing. The DELETE locks the row. So, a Restore that arrives now has to wait. If storage fails, the error undoes the DELETE: the letter stays in the trash, so it is still on the to-do list for the next try.
export async function destroyNote(id: string, stillAllowed: SQL | undefined) {
  return db.transaction(async (tx) => {
    const [gone] = await tx
      .delete(notes)
      .where(and(eq(notes.id, id), stillAllowed))
      .returning({ id: notes.id });
    if (!gone) return false;

    await photos.removeAllFor(gone.id);
    return true;
  });
}

//one at a time so that one broken letter cannot stop the rest
export async function destroyNotes(ids: string[], stillAllowed: SQL | undefined) {
  let destroyed = 0;
  let failed = 0;
  for (const id of ids) {
    try {
      if (await destroyNote(id, stillAllowed)) destroyed++;
    } catch (error) {
      failed++;
      console.error(`Could not destroy note ${id}`, error);
    }
  }
  return { destroyed, failed };
}
