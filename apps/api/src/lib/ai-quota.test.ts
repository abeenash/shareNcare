import { describe, expect, test } from "bun:test";
import { fakeLimiter } from "../../test/fake-ai-quota";
import { createAiQuota } from "./ai-quota";

const newQuota = (perPerson = 3, everyone = 150) => {
  const limiters = { perPerson: fakeLimiter(perPerson), everyone: fakeLimiter(everyone) };
  return { quota: createAiQuota(limiters), limiters };
};

describe("createAiQuota", () => {
  test("three for each person, counting down, then no", async () => {
    const { quota } = newQuota();
    expect(await quota.take("asha")).toEqual({ ok: true, remaining: 2 });
    expect(await quota.take("asha")).toEqual({ ok: true, remaining: 1 });
    expect(await quota.take("asha")).toEqual({ ok: true, remaining: 0 });
    expect(await quota.take("asha")).toMatchObject({ ok: false, who: "you" });
  });

  test("each person has their own three", async () => {
    const { quota } = newQuota(1);
    await quota.take("asha");
    expect(await quota.take("bikash")).toEqual({ ok: true, remaining: 0 });
  });

  test("when everyone's budget is spent, nobody gets more", async () => {
    const { quota } = newQuota(3, 2);
    await quota.take("asha");
    await quota.take("bikash");
    expect(await quota.take("chandra")).toMatchObject({ ok: false, who: "everyone" });
  });

  test("a person over their own limit doesn't use up everyone's budget", async () => {
    const { quota, limiters } = newQuota(1);
    await quota.take("asha");
    await quota.take("asha");
    expect(limiters.everyone.used.get("all")).toBe(1);
  });
});
