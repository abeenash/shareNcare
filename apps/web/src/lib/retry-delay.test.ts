import { describe, expect, test } from "bun:test";
import { retryDelay } from "./retry-delay";

// Pretend dice: one that always rolls the lowest, one that always rolls the highest.
const lowest = () => 0;
const highest = () => 1;

describe("how long to wait before reconnecting", () => {
  test("the first retry waits between half a second and a second", () => {
    expect(retryDelay(0, lowest)).toBe(500);
    expect(retryDelay(0, highest)).toBe(1000);
  });

  test("each failure doubles the wait", () => {
    expect(retryDelay(1, highest)).toBe(2000);
    expect(retryDelay(2, highest)).toBe(4000);
    expect(retryDelay(3, highest)).toBe(8000);
  });

  test("it never waits longer than 30 seconds", () => {
    expect(retryDelay(5, highest)).toBe(30_000);
    expect(retryDelay(50, highest)).toBe(30_000);
    expect(retryDelay(50, lowest)).toBe(15_000);
  });

  test("with real dice, the wait lands inside the range", () => {
    for (let roll = 0; roll < 100; roll++) {
      const wait = retryDelay(2);
      expect(wait).toBeGreaterThanOrEqual(2000);
      expect(wait).toBeLessThanOrEqual(4000);
    }
  });
});
