import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import type { Context } from "hono";
import { createMiddleware } from "hono/factory";
import { HTTPException } from "hono/http-exception";
import { endTime, startTime } from "hono/timing";
import { env } from "../env";
import { clientIp } from "../lib/client-ip";

const redis = new Redis({
  url: env.UPSTASH_REDIS_REST_URL,
  token: env.UPSTASH_REDIS_REST_TOKEN,
});

const ratelimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(10, "20 s"),
  prefix: "sharencare",
});

const tooMany = (reset: number, c: Context) => {
  const secondsLeft = Math.max(1, Math.ceil((reset - Date.now()) / 1000));
  c.header("Retry-After", String(secondsLeft));
  return new HTTPException(429, { message: "Too many requests. Please slow down." });
};

export const rateLimit = createMiddleware(async (c, next) => {
  if (env.RATE_LIMIT === "off") return next();
  startTime(c, "ratelimit", "Upstash rate limit");
  const result = await ratelimit.limit(clientIp(c)).catch((error: unknown) => {
    console.warn("Rate limiter unavailable, letting the request through:", error);
    return null;
  });
  endTime(c, "ratelimit");

  if (result && !result.success) throw tooMany(result.reset, c);
  await next();
});
