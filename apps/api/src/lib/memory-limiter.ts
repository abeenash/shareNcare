import type { Limiter } from "./ai-quota";

const DAY_MS = 24 * 60 * 60 * 1000;

export function memoryLimiter(max: number) {
  const used = new Map<string, number>();
  let today = Math.floor(Date.now() / DAY_MS);

  const turnThePage = () => {
    const now = Math.floor(Date.now() / DAY_MS);
    if (now !== today) {
      used.clear();
      today = now;
    }
  };

  const left = (key: string) => ({
    remaining: Math.max(0, max - (used.get(key) ?? 0)),
    reset: (today + 1) * DAY_MS,
  });

  const limiter: Limiter & { used: Map<string, number> } = {
    used,
    async limit(key) {
      turnThePage();
      const count = (used.get(key) ?? 0) + 1;
      used.set(key, count);
      return {
        success: count <= max,
        ...left(key),
      };
    },
    async getRemaining(key) {
      turnThePage();
      return left(key);
    },
  };
  return limiter;
}
