import { describe, expect, test } from "bun:test";
import { safeNext } from "./safe-next";

describe("where to go after signing in", () => {
  test("no ?next= at all goes to the desk", () => {
    expect(safeNext(null)).toBe("/");
    expect(safeNext("")).toBe("/");
  });

  test("a page on this site is kept", () => {
    expect(safeNext("/b/AbCdEfGhIjKlMnOpQrStUv")).toBe("/b/AbCdEfGhIjKlMnOpQrStUv");
    expect(safeNext("/boards")).toBe("/boards");
  });

  test("another website is refused", () => {
    expect(safeNext("https://elsewhere.example")).toBe("/");
    expect(safeNext("//elsewhere.example")).toBe("/");
    expect(safeNext("/\\elsewhere.example")).toBe("/");
  });

  test("anything that is not a path is refused", () => {
    expect(safeNext("javascript:alert(1)")).toBe("/");
    expect(safeNext("boards")).toBe("/");
  });
});
