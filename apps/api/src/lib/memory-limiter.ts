import type { Limiter } from "./ai-quota";

const DAY_MS = 24 * 60 * 60 * 1000;

export function memoryLimiter(max: number) {
  const used = new Map<string, number>();
  let today = Math.floor(Date.now() / DAY_MS);

  const limiter: Limiter & { used: Map<string, number> } = {
    used,
    async limit(key) {
      const now = Math.floor(Date.now() / DAY_MS);
      if (now !== today) {
        used.clear();
        today = now;
      }
      const count = (used.get(key) ?? 0) + 1;
      used.set(key, count);
      return {
        success: count <= max,
        remaining: Math.max(0, max - count),
        reset: (today + 1) * DAY_MS,
      };
    },
  };
  return limiter;
}
