import { describe, expect, test } from "bun:test";
import { clockTime, comeBackAt } from "./come-back";

const NOW = new Date("2026-11-25T18:00:00Z").getTime();

describe("comeBackAt", () => {
  test("turns seconds from now into a moment", () => {
    expect(comeBackAt("21600", NOW)?.toISOString()).toBe("2026-11-26T00:00:00.000Z");
  });

  test("gives null for anything that isn't a number of seconds", () => {
    expect(comeBackAt(null, NOW)).toBeNull();
    expect(comeBackAt("", NOW)).toBeNull();
    expect(comeBackAt("soon", NOW)).toBeNull();
    expect(comeBackAt("-5", NOW)).toBeNull();
    expect(comeBackAt("Wed, 26 Nov 2026 00:00:00 GMT", NOW)).toBeNull();
  });
});

describe("clockTime", () => {
  test("midnight UTC is 5:45 AM in Nepal, and 7 PM the evening before in New York", () => {
    const midnightUtc = new Date("2026-11-26T00:00:00Z");
    expect(clockTime(midnightUtc, "en-US", "Asia/Kathmandu")).toBe("5:45 AM");
    expect(clockTime(midnightUtc, "en-US", "America/New_York")).toBe("7:00 PM");
  });
});
