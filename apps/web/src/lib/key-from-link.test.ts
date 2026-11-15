import { describe, expect, test } from "bun:test";
import { keyFromLink } from "./key-from-link";

const KEY = "q2Zt8vN4kX0bW7yLmP3sR9cT1uE6aH5jD-_fG2iK0oQ";

describe("the key in a link", () => {
  test("a link's # part with a key gives the key", () => {
    expect(keyFromLink(`#${KEY}`)).toBe(KEY);
  });

  test("the same key without the # still counts", () => {
    expect(keyFromLink(KEY)).toBe(KEY);
  });

  test("no # part at all means no key", () => {
    expect(keyFromLink("")).toBeNull();
    expect(keyFromLink("#")).toBeNull();
  });

  test("a key cut short by a bad copy and paste is no key", () => {
    expect(keyFromLink(`#${KEY.slice(0, 40)}`)).toBeNull();
  });

  test("anything that is not exactly key-shaped is no key", () => {
    expect(keyFromLink(`#${KEY}x`)).toBeNull();
    expect(keyFromLink(`#${KEY.slice(0, 42)}=`)).toBeNull();
    expect(keyFromLink("#<script>alert(1)</script>")).toBeNull();
  });
});
