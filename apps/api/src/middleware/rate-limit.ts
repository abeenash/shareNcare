import { getConnInfo } from "@hono/bun";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import type { Context } from "hono";
import { createMiddleware } from "hono/factory";
import { HTTPException } from "hono/http-exception";
import { endTime, startTime } from "hono/timing";
import { env } from "../env";

const ratelimit = new Ratelimit({
  redis: new Redis({
    url: env.UPSTASH_REDIS_REST_URL,
    token: env.UPSTASH_REDIS_REST_TOKEN,
  }),
  limiter: Ratelimit.slidingWindow(10, "20 s"),
  prefix: "sharencare",
});

const getClientIp = (c: Context): string => {
  if (env.NODE_ENV === "production") {
    const forwarded = c.req.header("x-forwarded-for")?.split(",")[0]?.trim();
    if (forwarded) return forwarded;
  }
  return getConnInfo(c).remote.address ?? "unknown";
};

export const rateLimit = createMiddleware(async (c, next) => {
  startTime(c, "ratelimit", "Upstash rate limit");
  const result = await ratelimit.limit(getClientIp(c)).catch((error: unknown) => {
    console.warn("Rate limiter unavailable, letting the request through:", error);
    return null;
  });
  endTime(c, "ratelimit");

  if (result && !result.success) {
    const secondsLeft = Math.max(1, Math.ceil((result.reset - Date.now()) / 1000));
    c.header("Retry-After", String(secondsLeft));
    throw new HTTPException(429, { message: "Too many requests. Please slow down." });
  }
  await next();
});
