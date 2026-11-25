import type { Limiter } from "../src/lib/ai-quota";

const tomorrowUtc = () => (Math.floor(Date.now() / 86_400_000) + 1) * 86_400_000;

export function fakeLimiter(max: number) {
  const used = new Map<string, number>();
  const limiter: Limiter & { used: Map<string, number> } = {
    used,
    async limit(key) {
      if (quotaOutage.on) throw new Error("Upstash is down");
      const count = (used.get(key) ?? 0) + 1;
      used.set(key, count);
      return { success: count <= max, remaining: Math.max(0, max - count), reset: tomorrowUtc() };
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
