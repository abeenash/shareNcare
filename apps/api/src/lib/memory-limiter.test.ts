import { afterEach, describe, expect, setSystemTime, test } from "bun:test";
import { memoryLimiter } from "./memory-limiter";

const NOON_UTC = new Date("2026-11-25T12:00:00Z");
const NEXT_MIDNIGHT_UTC = new Date("2026-11-26T00:00:00Z").getTime();

afterEach(() => {
  setSystemTime();
});

describe("memoryLimiter", () => {
  test("counts each key up to its limit, then says no", async () => {
    setSystemTime(NOON_UTC);
    const limiter = memoryLimiter(2);
    expect(await limiter.limit("asha")).toMatchObject({ success: true, remaining: 1 });
    expect(await limiter.limit("asha")).toMatchObject({ success: true, remaining: 0 });
    expect(await limiter.limit("asha")).toMatchObject({ success: false, remaining: 0 });
    expect(await limiter.limit("bikash")).toMatchObject({ success: true, remaining: 1 });
  });

  test("frees up at the next midnight UTC", async () => {
    setSystemTime(NOON_UTC);
    const limiter = memoryLimiter(1);
    const answer = await limiter.limit("asha");

    expect(answer.reset).toBe(NEXT_MIDNIGHT_UTC);
  });

  test("a new day starts fresh", async () => {
    setSystemTime(NOON_UTC);
    const limiter = memoryLimiter(1);
    await limiter.limit("asha");
    expect((await limiter.limit("asha")).success).toBe(false);

    setSystemTime(new Date(NEXT_MIDNIGHT_UTC + 1000));
    expect((await limiter.limit("asha")).success).toBe(true);
  });
});
