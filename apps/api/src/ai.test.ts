import { beforeEach, describe, expect, spyOn, test } from "bun:test";
import { AI_HELP_MAX_CHARS, type ApiErrorBody } from "@sharencare/shared";
import { testClient } from "hono/testing";
import { captureLogs } from "../test/capture-logs";
import { fakeAiLimiters, quotaOutage, resetFakeAiQuota } from "../test/fake-ai-quota";
import { app } from "./app";
import { db } from "./db";
import { notes } from "./db/schema";
import { env } from "./env";
import { ai, FAKE_SUGGESTION } from "./lib/ai";

const client = testClient(app);
const asBob = { headers: { "x-test-user": "bob" } };
const asNobody = { headers: { "x-test-user": "nobody" } };
const DRAFT = "Dear Didi, thanks for the cardamom tea. You are the best.";
const BOX = "v1.QUJDREVGR0hJSktM.Ab3-xYz_0123456789abcdefghijk"; // shaped like a locked box

const ask = (json: { text: string; noteId?: string }, options?: typeof asBob) =>
  client.api.ai["help-me-write"].$post({ json }, options);

const errorOf = async (res: { json(): Promise<unknown> }) =>
  ((await res.json()) as ApiErrorBody).error;

beforeEach(async () => {
  resetFakeAiQuota();
  await db.delete(notes);
});

describe("POST /api/ai/help-me-write", () => {
  test("gives a suggestion, and says how many are left today", async () => {
    const res = await ask({ text: DRAFT });

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ suggestion: FAKE_SUGGESTION, remaining: 2 });
  });

  test("sends the draft to the model inside the letter fence", async () => {
    const watched = spyOn(ai, "complete");
    try {
      await ask({ text: DRAFT });
      const [messages] = watched.mock.calls[0] ?? [];
      expect(messages?.[1]?.content).toBe(`<letter>\n${DRAFT}\n</letter>`);
    } finally {
      watched.mockRestore();
    }
  });

  test("three a day, then a friendly no that says when to come back", async () => {
    for (let i = 0; i < 3; i++) expect((await ask({ text: DRAFT })).status).toBe(200);

    const res = await ask({ text: DRAFT });
    expect(res.status).toBe(429);
    expect((await errorOf(res)).message).toContain("3 free suggestions for today");
    const seconds = Number(res.headers.get("retry-after"));
    expect(seconds).toBeGreaterThan(0);
    expect(seconds).toBeLessThanOrEqual(24 * 60 * 60);
  });

  test("each person has their own three", async () => {
    for (let i = 0; i < 3; i++) await ask({ text: DRAFT });
    expect((await ask({ text: DRAFT }, asBob)).status).toBe(200);
  });

  test("when everyone's daily budget is spent, nobody gets more", async () => {
    fakeAiLimiters.everyone.used.set("all", 150);
    const res = await ask({ text: DRAFT });

    expect(res.status).toBe(429);
    expect((await errorOf(res)).message).toContain("all the letters it can for today");
  });

  test("a locked box is refused before anything is counted or sent", async () => {
    const watched = spyOn(ai, "complete");
    try {
      const res = await ask({ text: BOX });
      expect(res.status).toBe(400);
      expect(watched).not.toHaveBeenCalled();
      expect(fakeAiLimiters.perPerson.used.size).toBe(0);
    } finally {
      watched.mockRestore();
    }
  });

  test("a saved locked letter is refused, even with its words in the request", async () => {
    const created = await client.api.notes.$post({
      json: { title: "Secret", description: BOX, locked: true },
    });
    const { id } = await created.json();

    const watched = spyOn(ai, "complete");
    try {
      const res = await ask({ text: "the unlocked words, read in the browser", noteId: id });
      expect(res.status).toBe(409);
      expect(watched).not.toHaveBeenCalled();
    } finally {
      watched.mockRestore();
    }
  });

  test("someone else's letter can't be used", async () => {
    const created = await client.api.notes.$post(
      { json: { title: "Bob's", description: "x" } },
      asBob,
    );
    const { id } = await created.json();

    expect((await ask({ text: DRAFT, noteId: id })).status).toBe(404);
  });

  test("if the counter is down, the answer is no (fail closed)", async () => {
    quotaOutage.on = true;
    const watched = spyOn(ai, "complete");
    const logs = captureLogs();
    try {
      const res = await ask({ text: DRAFT });
      expect(res.status).toBe(503);
      expect(watched).not.toHaveBeenCalled();
    } finally {
      logs.stop();
      watched.mockRestore();
    }
  });

  test("if the model fails, a friendly 502, and an alert for us", async () => {
    const broken = spyOn(ai, "complete").mockRejectedValueOnce(
      new Error("The AI provider answered 500"),
    );
    const logs = captureLogs();
    try {
      const res = await ask({ text: DRAFT });
      expect(res.status).toBe(502);
      expect((await errorOf(res)).message).toContain("couldn't find the words");
    } finally {
      logs.stop();
      broken.mockRestore();
    }
    expect(logs.entries().some((entry) => entry.event === "ai.failed")).toBe(true);
  });

  test("an empty answer is not a suggestion", async () => {
    const blank = spyOn(ai, "complete").mockResolvedValueOnce("   ");
    try {
      expect((await ask({ text: DRAFT })).status).toBe(502);
    } finally {
      blank.mockRestore();
    }
  });

  test("the words never reach the logs", async () => {
    const logs = captureLogs();
    try {
      await ask({ text: DRAFT });
    } finally {
      logs.stop();
    }

    expect(logs.entries().some((entry) => entry.event === "ai.suggested")).toBe(true);
    expect(logs.lines.join("\n")).not.toContain("cardamom");
  });

  test("a draft longer than the limit is refused", async () => {
    const res = await ask({ text: "a".repeat(AI_HELP_MAX_CHARS + 1) });
    expect(res.status).toBe(400);
  });

  test("signed out, nobody gets in", async () => {
    expect((await ask({ text: DRAFT }, asNobody)).status).toBe(401);
  });

  test("switched off, the route doesn't exist, and the web is told", async () => {
    env.AI_FEATURES = "off";
    try {
      expect((await ask({ text: DRAFT })).status).toBe(404);
      expect(await (await client.api.features.$get()).json()).toMatchObject({ aiHelp: false });
    } finally {
      env.AI_FEATURES = "on";
    }
    expect(await (await client.api.features.$get()).json()).toMatchObject({ aiHelp: true });
  });
});
