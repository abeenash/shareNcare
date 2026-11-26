import type { Limiter } from "../src/lib/ai-quota";
import { memoryLimiter } from "../src/lib/memory-limiter";

export function fakeLimiter(max: number) {
  const counter = memoryLimiter(max);
  const limiter: Limiter & { used: Map<string, number> } = {
    used: counter.used,
    async limit(key) {
      if (quotaOutage.on) throw new Error("Upstash is down");
      return counter.limit(key);
    },
    async getRemaining(key) {
      if (quotaOutage.on) throw new Error("Upstash is down");
      return counter.getRemaining(key);
    },
  };
  return limiter;
}

export const quotaOutage = { on: false };

export const fakeAiLimiters = { perPerson: fakeLimiter(3), everyone: fakeLimiter(150) };

export function resetFakeAiQuota() {
  fakeAiLimiters.perPerson.used.clear();
  fakeAiLimiters.everyone.used.clear();
  quotaOutage.on = false;
}
