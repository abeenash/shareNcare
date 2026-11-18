import { eq } from "drizzle-orm";
import { Hono } from "hono";
import { db } from "../db";
import { user } from "../db/schema";
import { rateLimit } from "../middleware/rate-limit";
import { requireUser } from "../middleware/require-user";

//things about the signed-in person themselves
export const meRoute = new Hono()
  .use(rateLimit)
  .use(requireUser)
  /* Koinonia's tour was finished or skipped. Stored on the server, so it
  stays seen on every device */
  .post("/tour-seen", async (c) => {
    await db
      .update(user)
      .set({ tourSeenAt: new Date() })
      .where(eq(user.id, c.get("user").id));
    return c.body(null, 204);
  });
