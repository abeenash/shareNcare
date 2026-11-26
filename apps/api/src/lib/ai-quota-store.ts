import { AI_DAILY_SUGGESTIONS } from "@sharencare/shared";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { env } from "../env";
import { createAiQuota } from "./ai-quota";
import { memoryLimiter } from "./memory-limiter";

/* Suggestions per day for everyone together. Worst case for one suggestion on Gemma 4 26B
 (thinking off): 2,000 tokens in x 9,091 Neurons/M + 1,000 out x 27,273 Neurons/M = about
 46 Neurons. 150 x 46 = 6,900, inside the free 10,000 a day, with room for eval runs.
 Choosing another model? Redo this sum with its Neurons from the Workers AI pricing page. */
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
