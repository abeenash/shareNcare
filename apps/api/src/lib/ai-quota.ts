export type Limiter = {
  limit(key: string): Promise<{ success: boolean; remaining: number; reset: number }>;
};

export type QuotaAnswer =
  | { ok: true; remaining: number }
  | { ok: false; who: "you" | "everyone"; reset: number };

export function createAiQuota(limiters: { perPerson: Limiter; everyone: Limiter }) {
  return {
    async take(userId: string): Promise<QuotaAnswer> {
      const mine = await limiters.perPerson.limit(userId);
      if (!mine.success) return { ok: false, who: "you", reset: mine.reset };

      const all = await limiters.everyone.limit("all");
      if (!all.success) return { ok: false, who: "everyone", reset: all.reset };

      return { ok: true, remaining: mine.remaining };
    },
  };
}
