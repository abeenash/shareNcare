import { describe, expect, test } from "bun:test";
import { writingLine } from "./writing-line";

describe("the line that says who is writing", () => {
  test("nobody writing shows nothing at all", () => {
    expect(writingLine([])).toBeNull();
  });

  test("one person", () => {
    expect(writingLine(["Asha"])).toBe("Asha is writing...");
  });

  test("two people are both named", () => {
    expect(writingLine(["Asha", "Ravi"])).toBe("Asha and Ravi are writing...");
  });

  test("three or more: the first name, then how many others", () => {
    expect(writingLine(["Asha", "Ravi", "Mina"])).toBe("Asha and 2 others are writing...");
    expect(writingLine(["Asha", "Ravi", "Mina", "Didi", "Om"])).toBe(
      "Asha and 4 others are writing...",
    );
  });
});
