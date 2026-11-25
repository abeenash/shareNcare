import {
  AI_DAILY_SUGGESTIONS,
  type HelpMeWriteAnswer,
  HelpMeWriteSchema,
  LOCKED_BOX,
} from "@sharencare/shared";
import { and, eq } from "drizzle-orm";
import { type Context, Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { db } from "../db";
import { notes } from "../db/schema";
import { env } from "../env";
import { ai } from "../lib/ai";
import type { QuotaAnswer } from "../lib/ai-quota";
import { aiQuota } from "../lib/ai-quota-upstash";
import { trackError } from "../lib/error-tracking";
import { cleanSuggestion, helpMeWriteMessages } from "../lib/help-me-write";
import { log } from "../lib/log";
import { validate } from "../lib/validate";
import { rateLimit } from "../middleware/rate-limit";
import { requireUser } from "../middleware/require-user";

const LOCKED = "Locked letters stay between you and the key, so Koinonia can't read them";
const YOUR_LIMIT = `You've used your ${AI_DAILY_SUGGESTIONS} free suggestions for today. They come back at midnight UTC`;
const EVERYONE_LIMIT =
  "Koinonia has helped with all the letters it can for today. Please try again tomorrow.";
const RESTING = "Koinonia is resting for a moment. Please try again in a few minutes.";
const NO_WORDS = "Koinonia couldn't find the words just now. Please try again.";

function overLimit(c: Context, reset: number, message: string) {
  const seconds = Math.max(1, Math.ceil((reset - Date.now()) / 1000));
  c.header("Retry-After", String(seconds));
  return new HTTPException(429, { message });
}

export const aiRoute = new Hono()
  .use(async (_c, next) => {
    if (env.AI_FEATURES !== "on") throw new HTTPException(404, { message: "Not found" });
    await next();
  })
  .use(rateLimit)
  .use(requireUser)
  .post("/help-me-write", validate("json", HelpMeWriteSchema), async (c) => {
    const { text, noteId } = c.req.valid("json");
    const userId = c.get("user").id;

    //Rule #1 -> never see a locked letter
    if (LOCKED_BOX.test(text)) throw new HTTPException(400, { message: LOCKED });
    if (noteId) {
      const [note] = await db
        .select({ locked: notes.locked })
        .from(notes)
        .where(and(eq(notes.id, noteId), eq(notes.userId, userId)));
      if (!note) throw new HTTPException(404, { message: "Note not found" });
      if (note.locked) throw new HTTPException(409, { message: LOCKED });
    }

    //Rule #2 -> count before asking
    let quota: QuotaAnswer;
    try {
      quota = await aiQuota.take(userId);
    } catch (error) {
      trackError("ai.quota_unavailable", error);
      throw new HTTPException(503, { message: RESTING });
    }
    if (!quota.ok) {
      throw overLimit(c, quota.reset, quota.who === "you" ? YOUR_LIMIT : EVERYONE_LIMIT);
    }

    //Rule #3 -> answer is only a suggestion
    const started = performance.now();
    let suggestion: string | null = null;
    try {
      suggestion = cleanSuggestion(await ai.complete(helpMeWriteMessages(text)));
    } catch (error) {
      trackError("ai.failed", error, { provider: env.AI_PROVIDER });
    }
    if (!suggestion) throw new HTTPException(502, { message: NO_WORDS });

    log("info", "ai.suggested", {
      provider: env.AI_PROVIDER,
      ms: Math.round(performance.now() - started),
      remaining: quota.remaining,
    });
    return c.json({ suggestion, remaining: quota.remaining } satisfies HelpMeWriteAnswer);
  });
