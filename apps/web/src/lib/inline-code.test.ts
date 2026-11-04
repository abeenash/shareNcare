import { describe, expect, test } from "bun:test";
import { splitInlineCode } from "./inline-code";

describe("splitInlineCode", () => {
  test("plain text stays one plain piece", () => {
    expect(splitInlineCode("Dear Didi")).toEqual([{ text: "Dear Didi", code: false }]);
  });

  test("text between backticks becomes code, without the backticks", () => {
    expect(splitInlineCode("Run `bun run e2e` today")).toEqual([
      { text: "Run ", code: false },
      { text: "bun run e2e", code: true },
      { text: " today", code: false },
    ]);
  });

  test("handles more than one code piece, even at the very start", () => {
    expect(splitInlineCode("`git add` then `git commit`")).toEqual([
      { text: "git add", code: true },
      { text: " then ", code: false },
      { text: "git commit", code: true },
    ]);
  });

  test("a lone backtick is just a character", () => {
    expect(splitInlineCode("it`s fine")).toEqual([{ text: "it`s fine", code: false }]);
  });

  test("code never spans two lines", () => {
    expect(splitInlineCode("`a\nb`")).toEqual([{ text: "`a\nb`", code: false }]);
  });

  test("empty backticks are not code", () => {
    expect(splitInlineCode("say ``")).toEqual([{ text: "say ``", code: false }]);
  });
});
