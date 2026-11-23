import { afterAll, beforeAll, beforeEach, describe, expect, spyOn, test } from "bun:test";
import * as Sentry from "@sentry/bun";
import { collectNothing } from "@sharencare/shared";
import { eq } from "drizzle-orm";
import { testClient } from "hono/testing";
import { captureLogs } from "../test/capture-logs";
import { fakePhotos } from "../test/fake-photos";
import { app } from "./app";
import { db } from "./db";
import { notes } from "./db/schema";
import { errorTrackingOptions } from "./lib/error-tracking";

const client = testClient(app);
const asBob = { headers: { "x-test-user": "bob" } };
const options = errorTrackingOptions("https://publickey@sentry.example.com/1");

const sent: Sentry.ErrorEvent[] = [];

beforeAll(() => {
  Sentry.init({
    ...options,
    integrations: [], // no crash catchers inside a test run
    beforeSend: async (event, hint) => {
      const cleaned = await options.beforeSend?.(event, hint);
      if (cleaned) sent.push(cleaned);
      return null; // null = drop it, so the network is never touched
    },
  });
});

afterAll(() => Sentry.close());

beforeEach(() => {
  sent.length = 0;
});

async function crash<Res>(send: () => Res | Promise<Res>) {
  const logs = captureLogs();
  let res: Res;
  try {
    res = await send();
  } finally {
    logs.stop();
  }
  await Sentry.flush(2000);
  expect(sent).toHaveLength(1);
  return { res, report: sent[0] as Sentry.ErrorEvent };
}

async function sharedLetterWithPhoto() {
  const created = await client.api.notes.$post({ json: { title: "Hi", description: "x" } });
  const note = await created.json();
  await db
    .update(notes)
    .set({ photoKey: `notes/${note.id}/a` })
    .where(eq(notes.id, note.id));
  const shared = await client.api.notes[":id"].share.$post({ param: { id: note.id }, json: {} });
  const { shareToken } = await shared.json();
  return shareToken ?? "missing";
}

describe("the server's error reports", () => {
  test("start from nothing: only crash catchers, and no data collection", () => {
    const names = options.integrations;
    expect(Array.isArray(names) && names.map((integration) => integration.name)).toEqual([
      "OnUncaughtException",
      "OnUnhandledRejection",
      "LinkedErrors",
      "Dedupe",
    ]);
    expect(options.defaultIntegrations).toBe(false);
    expect(options.dataCollection).toEqual(collectNothing);
  });

  test("a crash on a share link carries the request id and route, and never the token", async () => {
    const token = await sharedLetterWithPhoto();
    const broken = spyOn(fakePhotos, "viewUrl").mockImplementation(() => {
      throw new Error(`Could not sign the photo for /api/shared/${token}`);
    });

    const { res, report } = await crash(() => app.request(`/api/shared/${token}`));
    broken.mockRestore();

    expect(res.status).toBe(500);
    expect(report.tags).toMatchObject({
      event: "crash",
      requestId: res.headers.get("x-request-id") ?? "missing",
      route: "/api/shared/:token",
    });
    expect(report.request).toBeUndefined();
    expect(JSON.stringify(report)).not.toContain(token);
    expect(report.exception?.values?.[0]?.value).toBe(
      "Could not sign the photo for /api/shared/:token",
    );
  });

  test("names a signed-in user by id only", async () => {
    const created = await client.api.notes.$post(
      { json: { title: "Bye", description: "x" } },
      asBob,
    );
    const note = await created.json();
    await client.api.notes[":id"].$delete({ param: { id: note.id } }, asBob);
    const broken = spyOn(fakePhotos, "removeAllFor").mockRejectedValueOnce(new Error("R2 is down"));

    const { report } = await crash(() =>
      client.api.notes[":id"].permanent.$delete({ param: { id: note.id } }, asBob),
    );
    broken.mockRestore();

    expect(report.user).toEqual({ id: "bob" });
    expect(JSON.stringify(report)).not.toContain("bob@test.dev");
  });
});
