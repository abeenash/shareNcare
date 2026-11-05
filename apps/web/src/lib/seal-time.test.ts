import { describe, expect, test } from "bun:test";
import {
  firstParts,
  isHourOpen,
  isMinuteOpen,
  monthHasDay,
  openYears,
  settle,
  toDate,
} from "./seal-time";

// A fixed "now" keeps these tests true forever: 4 November 2026 at 10:30 PM.
const NOW = new Date(2026, 10, 4, 22, 30);
const parts = { day: 4, month: 10, year: 2026, hour: 23, minute: 50 };

describe("which months can hold a day", () => {
  test("every month has a 28th", () => {
    for (let month = 0; month < 12; month++) expect(monthHasDay(28, month)).toBe(true);
  });

  test("February can have a 29th, but never a 30th", () => {
    expect(monthHasDay(29, 1)).toBe(true);
    expect(monthHasDay(30, 1)).toBe(false);
  });

  test("April has no 31st, and May does", () => {
    expect(monthHasDay(31, 3)).toBe(false);
    expect(monthHasDay(31, 4)).toBe(true);
  });
});

describe("which years are open", () => {
  test("today still counts, because some of today is left", () => {
    expect(openYears(4, 10, NOW)[0]).toBe(2026);
  });

  test("a date that already passed this year starts from next year", () => {
    expect(openYears(3, 10, NOW)[0]).toBe(2027);
  });

  test("29 February only appears in leap years", () => {
    expect(openYears(29, 1, NOW).slice(0, 3)).toEqual([2028, 2032, 2036]);
  });
});

describe("which hours and minutes are open today", () => {
  test("hours already over are closed, and the current hour stays open", () => {
    expect(isHourOpen(parts, 21, NOW)).toBe(false);
    expect(isHourOpen(parts, 22, NOW)).toBe(true);
  });

  test("the current minute is closed, because the moment must be in the future", () => {
    const thisHour = { ...parts, hour: 22 };
    expect(isMinuteOpen(thisHour, 30, NOW)).toBe(false);
    expect(isMinuteOpen(thisHour, 31, NOW)).toBe(true);
  });

  test("every hour of a future day is open", () => {
    expect(isHourOpen({ ...parts, day: 5 }, 0, NOW)).toBe(true);
  });
});

describe("settling on a real moment", () => {
  test("11:50 PM tonight is allowed", () => {
    expect(settle(parts, NOW)).toEqual(parts);
  });

  test("the 31st moves off a month without one", () => {
    expect(settle({ ...parts, day: 31, month: 3 }, NOW).month).toBe(4);
  });

  test("a date already past moves to next year", () => {
    expect(settle({ ...parts, month: 0, day: 1 }, NOW).year).toBe(2027);
  });

  test("a time already past today moves forward", () => {
    expect(settle({ ...parts, hour: 9, minute: 0 }, NOW)).toMatchObject({ hour: 22, minute: 31 });
  });

  test("the result is always in the future", () => {
    const settled = settle({ ...parts, hour: 0, minute: 0 }, NOW);
    expect(toDate(settled).getTime()).toBeGreaterThan(NOW.getTime());
  });

  test("the picker starts tomorrow, even on the last day of a year", () => {
    expect(firstParts(new Date(2026, 11, 31, 8, 15))).toEqual({
      day: 1,
      month: 0,
      year: 2027,
      hour: 8,
      minute: 15,
    });
  });
});
