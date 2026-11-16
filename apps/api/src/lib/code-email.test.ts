import { describe, expect, test } from "bun:test";
import { codeEmail } from "./code-email";

describe("the email that carries a code", () => {
  test("puts the code in the subject, so it shows in the notification", () => {
    expect(codeEmail("email-verification", "482913", 5).subject).toContain("482913");
    expect(codeEmail("forget-password", "482913", 5).subject).toContain("482913");
  });

  test("the code appears exactly once in the text, standing on its own", () => {
    const { text } = codeEmail("email-verification", "482913", 5);
    expect(text.match(/\b\d{6}\b/g)).toEqual(["482913"]);
  });

  test("says how long the code works", () => {
    expect(codeEmail("email-verification", "482913", 5).text).toContain("5 minutes");
    expect(codeEmail("forget-password", "482913", 10).text).toContain("10 minutes");
  });

  test("a reset emails says it's about the password, and calms the person who didn't ask", () => {
    const { subject, text } = codeEmail("forget-password", "482913", 5);
    expect(subject).toContain("password reset");
    expect(text).toContain("ignore this email");
    expect(text).toContain("password stays");
  });

  test("a welcome email never mentions a password", () => {
    const { subject, text } = codeEmail("email-verification", "482913", 5);
    expect(`${subject} ${text}`.toLowerCase()).not.toContain("password");
  });
});
