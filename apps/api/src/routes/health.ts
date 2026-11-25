import { APP_NAME, type HealthResponse } from "@sharencare/shared";
import { sql } from "drizzle-orm";
import { Hono } from "hono";
import { db } from "../db";
import { errorFields, log } from "../lib/log";
import { rateLimit } from "../middleware/rate-limit";

export const healthRoute = new Hono()
  .get("/", (c) =>
    c.json({
      ok: true,
      app: APP_NAME,
      runtime: `bun ${Bun.version}`,
      requestId: c.get("requestId"),
    } satisfies HealthResponse),
  )

  .get("/db", rateLimit, async (c) => {
    const started = performance.now();
    try {
      await db.execute(sql`select 1`);
    } catch (error) {
      log("warn", "health.db_down", { error: errorFields(error) });
      return c.json({ ok: false, db: "down" }, 503);
    }
    return c.json({ ok: true, db: "up", ms: Math.round(performance.now() - started) });
  });
