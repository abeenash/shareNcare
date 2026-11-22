import { describe, expect, test } from "bun:test";
import { captureLogs } from "../../test/capture-logs";
import { errorFields, hideEmails, log } from "./log";

describe("log", () => {
  test("writes one JSON line with the level and the event", () => {
    const logs = captureLogs();
    log("info", "hello", { count: 3 });
    logs.stop();

    expect(logs.lines).toHaveLength(1);
    expect(logs.entries()[0]).toEqual({ level: "info", event: "hello", count: 3 });
  });

  test("never lets an email address through, even inside a message", () => {
    const logs = captureLogs();
    log("warn", "auth", { message: "Sign-up attempt for existing email: asha.rai+1@gmail.com" });
    logs.stop();

    expect(logs.lines[0]).not.toContain("gmail.com");
    expect(logs.entries()[0]?.message).toBe("Sign-up attempt for existing email: [email]");
  });

  test("leaves package versions in stack traces alone", () => {
    const line = "at node_modules/better-auth@1.7.14/dist/index.mjs:10";
    expect(hideEmails(line)).toBe(line);
  });
});

describe("errorFields", () => {
  test("keeps the message and the stack of an Error", () => {
    const fields = errorFields(new Error("R2 is down"));
    expect(fields.message).toBe("R2 is down");
    expect(fields).toHaveProperty("stack");
  });

  test("turns anything else into a message", () => {
    expect(errorFields("plain words")).toEqual({ message: "plain words" });
  });
});
