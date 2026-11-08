import { describe, expect, test } from "bun:test";
import { parseGuestKeys } from "./guest-keys";

const KEY = "a".repeat(43);

describe("reading the guest keys this browser kept", () => {
  test("nothing stored yet gives an empty map", () => {
    expect(parseGuestKeys(null)).toEqual({});
  });

  test("a saved map comes back as it was", () => {
    expect(parseGuestKeys(JSON.stringify({ "note-1": KEY }))).toEqual({ "note-1": KEY });
  });

  test("text that is not JSON gives an empty map instead of crashing", () => {
    expect(parseGuestKeys("{not json")).toEqual({});
  });

  test("JSON of the wrong shape gives an empty map", () => {
    expect(parseGuestKeys('"just a string"')).toEqual({});
    expect(parseGuestKeys("[1, 2, 3]")).toEqual({});
    expect(parseGuestKeys(JSON.stringify({ "note-1": 42 }))).toEqual({});
  });
});
