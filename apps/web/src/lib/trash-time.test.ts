import { describe, expect, test } from "bun:test";
import { daysLeftInTrash, trashCountdown } from "./trash-time";

// A fixed "now" keeps these tests true forever.
const NOW = new Date("2026-11-07T12:00:00.000Z");
const daysAgo = (days: number) => new Date(NOW.getTime() - days * 86_400_000).toISOString();

describe("days left in the trash", () => {
  test("a letter trashed just now has the full 30 days", () => {
    expect(daysLeftInTrash(NOW.toISOString(), NOW)).toBe(30);
  });

  test("a letter trashed 10 days ago has 20 left", () => {
    expect(daysLeftInTrash(daysAgo(10), NOW)).toBe(20);
  });

  test("part of a day still counts as a day", () => {
    expect(daysLeftInTrash(daysAgo(29.5), NOW)).toBe(1);
  });

  test("exactly 30 days ago leaves nothing", () => {
    expect(daysLeftInTrash(daysAgo(30), NOW)).toBe(0);
  });

  test("an overdue letter never shows a negative number", () => {
    expect(daysLeftInTrash(daysAgo(45), NOW)).toBe(0);
  });
});

describe("the words on the card", () => {
  test("many days, one day, no days", () => {
    expect(trashCountdown(12)).toBe("12 DAYS LEFT");
    expect(trashCountdown(1)).toBe("1 DAY LEFT");
    expect(trashCountdown(0)).toBe("DELETED WITHIN A DAY");
  });
});
