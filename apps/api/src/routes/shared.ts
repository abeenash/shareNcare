import { ShareTokenSchema } from "@sharencare/shared";
import { and, eq, isNull, lte, or } from "drizzle-orm";
import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { db } from "../db";
import { notes, user } from "../db/schema";
import { validate } from "../lib/validate";
import { rateLimit } from "../middleware/rate-limit";

const letterNotHere = () => new HTTPException(404, { message: "This letter isn't here" });

const canBeOpened = (token: string) =>
  and(
    eq(notes.shareToken, token),
    eq(notes.burnAfterReading, true),
    isNull(notes.burnedAt),
    isNull(notes.deletedAt),
    or(isNull(notes.unsealAt), lte(notes.unsealAt, new Date())),
  );

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
        burnedAfterReading: notes.burnAfterReading,
        burnedAt: notes.burnedAt,
        unsealAt: notes.unsealAt,
      })
      .from(notes)
      .innerJoin(user, eq(notes.userId, user.id))
      .where(and(eq(notes.shareToken, token), isNull(notes.deletedAt)));

    if (!letter) throw letterNotHere();

    const envelope = {
      recipient: letter.recipient,
      from: letter.senderName.split(" ")[0] ?? letter.senderName,
    };

    if (letter.burnedAt) {
      return c.json({ state: "burned" as const, ...envelope, burnedAt: letter.burnedAt });
    }

    if (letter.unsealAt && letter.unsealAt > new Date()) {
      return c.json({ state: "sealed" as const, ...envelope, unsealAt: letter.unsealAt });
    }

    if (letter.burnedAfterReading) {
      return c.json({ state: "ready-to-burn" as const, ...envelope });
    }
    return c.json({
      state: "open" as const,
      ...envelope,
      title: letter.title,
      description: letter.description,
      createdAt: letter.createdAt,
    });
  })

  .post("/:token/open", validate("param", ShareTokenSchema), async (c) => {
    const { token } = c.req.valid("param");
    const letter = await db.transaction(async (tx) => {
      const [claimed] = await tx
        .update(notes)
        .set({ burnedAt: new Date() })
        .where(canBeOpened(token))
        .returning({
          id: notes.id,
          title: notes.title,
          description: notes.description,
          createdAt: notes.createdAt,
        });
      if (!claimed) return null;

      await tx.update(notes).set({ description: "" }).where(eq(notes.id, claimed.id));
      return claimed;
    });

    if (!letter) throw letterNotHere();

    return c.json({
      title: letter.title,
      description: letter.description,
      createdAt: letter.createdAt,
    });
  });
