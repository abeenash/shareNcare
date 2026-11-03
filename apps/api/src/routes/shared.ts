import { ShareTokenSchema } from "@sharencare/shared";
import { and, eq, isNull } from "drizzle-orm";
import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { db } from "../db";
import { notes, user } from "../db/schema";
import { validate } from "../lib/validate";
import { rateLimit } from "../middleware/rate-limit";

export const sharedRoute = new Hono()
  .use(rateLimit)
  .get("/:token", validate("param", ShareTokenSchema), async (c) => {
    const { token } = c.req.valid("param");
    const [letter] = await db
      .select({
        title: notes.title,
        description: notes.description,
        recipient: notes.recipient,
        createdAt: notes.createdAt,
        senderName: user.name,
      })
      .from(notes)
      .innerJoin(user, eq(notes.userId, user.id))
      .where(and(eq(notes.shareToken, token), isNull(notes.deletedAt)));

    if (!letter) throw new HTTPException(404, { message: "This letter isn't here" });

    const { senderName, ...rest } = letter;
    return c.json({ ...rest, from: senderName.split(" ")[0] ?? senderName });
  });
