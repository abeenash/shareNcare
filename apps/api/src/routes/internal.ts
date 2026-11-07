import { TRASH_DAYS } from "@sharencare/shared";
import { asc, lt } from "drizzle-orm";
import { Hono } from "hono";
import { bearerAuth } from "hono/bearer-auth";
import { db } from "../db";
import { notes } from "../db/schema";
import { env } from "../env";
import { destroyNotes } from "../lib/destroy-notes";

const DAY_MS = 24 * 60 * 60 * 1000;
const SWEEP_LIMIT = 100;

export const internalRoute = new Hono()
  .use(bearerAuth({ token: env.CRON_SECRET }))
  .post("/sweep-trash", async (c) => {
    const cutoff = new Date(Date.now() - TRASH_DAYS * DAY_MS);
    const overdue = lt(notes.deletedAt, cutoff);

    const oldest = await db
      .select({ id: notes.id })
      .from(notes)
      .where(overdue)
      .orderBy(asc(notes.deletedAt))
      .limit(SWEEP_LIMIT);

    const result = await destroyNotes(
      oldest.map((note) => note.id),
      overdue,
    );

    //a failed sweep must look failed. so the scheduler retries and turns red
    return c.json(result, result.failed > 0 ? 500 : 200);
  });
