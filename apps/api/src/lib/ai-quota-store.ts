import { AI_DAILY_SUGGESTIONS } from "@sharencare/shared";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { env } from "../env";
import { createAiQuota } from "./ai-quota";
import { memoryLimiter } from "./memory-limiter";

//Can't afford smart models recently 🥲
export const AI_DAILY_BUDGET = 150;

function upstashQuota() {
  const redis = new Redis({
    url: env.UPSTASH_REDIS_REST_URL,
    token: env.UPSTASH_REDIS_REST_TOKEN,
  });

  return createAiQuota({
    perPerson: new Ratelimit({
      redis,
      limiter: Ratelimit.fixedWindow(AI_DAILY_SUGGESTIONS, "1 d"),
      prefix: "sharencare:ai:person",
    }),
    everyone: new Ratelimit({
      redis,
      limiter: Ratelimit.fixedWindow(AI_DAILY_BUDGET, "1 d"),
      prefix: "sharencare:ai:everyone",
    }),
  });
}

export const aiQuota =
  env.AI_PROVIDER === "fake"
    ? createAiQuota({
        perPerson: memoryLimiter(AI_DAILY_SUGGESTIONS),
        everyone: memoryLimiter(AI_DAILY_BUDGET),
      })
    : upstashQuota();
