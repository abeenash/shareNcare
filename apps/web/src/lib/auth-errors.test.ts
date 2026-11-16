import { describe, expect, test } from "bun:test";
import { authErrorMessage } from "./auth-errors";

describe("what a person reads when auth says no", () => {
  test("a wrong code is explained in plain words, not as 'Invalid OTP'", () => {
    const message = authErrorMessage({ code: "INVALID_OTP", message: "Invalid OTP" });
    expect(message).not.toBe("Invalid OTP");
    expect(message).toContain("code");
  });

  test("an expired code and too many attempts both point to a new code", () => {
    expect(authErrorMessage({ code: "OTP_EXPIRED", message: "OTP expired" })).toContain("new code");
    expect(authErrorMessage({ code: "TOO_MANY_ATTEMPTS", message: "Too many attempts" })).toContain(
      "new code",
    );
  });

  test("a code we have no words for keeps the server's own message", () => {
    const breached = "This password has shown up in a data breach, so attackers try it first.";
    expect(authErrorMessage({ code: "PASSWORD_COMPROMISED", message: breached })).toBe(breached);
  });

  test("an answer with no code at all, like a rate limit, keeps its message", () => {
    const slowDown = "Too many requests. Please try again later.";
    expect(authErrorMessage({ message: slowDown })).toBe(slowDown);
  });

  test("with nothing to go on, it still says something", () => {
    expect(authErrorMessage({}).length).toBeGreaterThan(0);
  });
});
