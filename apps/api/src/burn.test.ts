import { beforeEach, describe, expect, test } from "bun:test";
import { eq } from "drizzle-orm";
import { testClient } from "hono/testing";
import { app } from "./app";
import { db } from "./db";
import { notes } from "./db/schema";

const client = testClient(app);
const inTenDays = () => new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString();

beforeEach(async () => {
  await db.delete(notes);
});

async function shareLetter(options: { burnAfterReading?: boolean; unsealAt?: string }) {
  const created = await client.api.notes.$post({
    json: { title: "For you", description: "The secret words.", recipient: "Didi" },
  });
  const { id } = await created.json();
  const shared = await client.api.notes[":id"].share.$post({ param: { id }, json: options });
  expect(shared.status).toBe(200);
  const { shareToken } = await shared.json();
  if (!shareToken) throw new Error("Expected a share token");
  return { id, token: shareToken };
}

const look = (token: string) => client.api.shared[":token"].$get({ param: { token } });
const open = (token: string) => client.api.shared[":token"].open.$post({ param: { token } });

describe("burn after reading", () => {
  test("looking shows only the envelope, however many times", async () => {
    const { token } = await shareLetter({ burnAfterReading: true });

    for (const _visit of [1, 2, 3]) {
      const res = await look(token);
      expect(Object.keys(await res.json()).sort()).toEqual(["from", "recipient", "state"]);
    }

    expect((await open(token)).status).toBe(200);
  });

  test("the first open gets the words, and the second gets nothing", async () => {
    const { token } = await shareLetter({ burnAfterReading: true });

    const first = await open(token);
    expect(await first.json()).toMatchObject({ description: "The secret words." });

    expect((await open(token)).status).toBe(404);
    expect(await (await look(token)).json()).toMatchObject({ state: "burned" });
  });

  test("the words are erased from the database, even for the owner", async () => {
    const { id, token } = await shareLetter({ burnAfterReading: true });
    await open(token);

    const [row] = await db.select().from(notes).where(eq(notes.id, id));
    expect(row?.description).toBe("");
    expect(row?.burnedAt).not.toBeNull();
  });

  test("when ten people open at once, exactly one gets the letter", async () => {
    const { token } = await shareLetter({ burnAfterReading: true });

    const results = await Promise.all(Array.from({ length: 10 }, () => open(token)));

    expect(results.filter((res) => res.status === 200)).toHaveLength(1);
    expect(results.filter((res) => res.status === 404)).toHaveLength(9);
  });

  test("a burned letter cannot be edited or shared again", async () => {
    const { id, token } = await shareLetter({ burnAfterReading: true });
    await open(token);

    const param = { id };
    const edit = await client.api.notes[":id"].$put({
      param,
      json: { title: "New", description: "New words" },
    });
    const share = await client.api.notes[":id"].share.$post({ param, json: {} });
    expect([edit.status, share.status]).toEqual([404, 404]);
  });

  test("an ordinary shared letter cannot be burned by a stranger", async () => {
    const { token } = await shareLetter({});

    expect((await open(token)).status).toBe(404);
    expect(await (await look(token)).json()).toMatchObject({ state: "open" });
  });

  test("stopping sharing clears the burn and seal choices", async () => {
    const { id } = await shareLetter({ burnAfterReading: true, unsealAt: inTenDays() });

    const stop = await client.api.notes[":id"].share.$delete({ param: { id } });

    expect(await stop.json()).toMatchObject({ burnAfterReading: false, unsealAt: null });
  });
});

describe("sealed letters", () => {
  test("before the date a stranger gets the envelope and no words", async () => {
    const { token } = await shareLetter({ unsealAt: inTenDays() });

    const body = await (await look(token)).json();

    expect(Object.keys(body).sort()).toEqual(["from", "recipient", "state", "unsealAt"]);
    expect(JSON.stringify(body)).not.toContain("secret");
  });

  test("a sealed burn letter cannot be opened early", async () => {
    const created = await client.api.notes.$post({ json: { title: "A", description: "B" } });
    const { id } = await created.json();

    const res = await client.api.notes[":id"].share.$post({
      param: { id },
      json: { unsealAt: "2020-01-01T00:00:00.000Z" },
    });

    expect(res.status).toBe(400);
  });

  test("after the date the letter opens", async () => {
    const { id, token } = await shareLetter({ unsealAt: inTenDays() });
    await db
      .update(notes)
      .set({ unsealAt: new Date(Date.now() - 1000) })
      .where(eq(notes.id, id));
    expect(await (await look(token)).json()).toMatchObject({
      state: "open",
      description: "The secret words.",
    });
  });

  test("a sealed burn letter cannot be opened daily", async () => {
    const { id, token } = await shareLetter({ burnAfterReading: true, unsealAt: inTenDays() });
    expect((await open(token)).status).toBe(404);

    await db
      .update(notes)
      .set({ unsealAt: new Date(Date.now() - 1000) })
      .where(eq(notes.id, id));
    expect((await open(token)).status).toBe(200);
  });
});
