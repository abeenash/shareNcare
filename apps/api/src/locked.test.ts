import { beforeEach, describe, expect, test } from "bun:test";
import { MAX_LOCKED_BOX } from "@sharencare/shared";
import { eq } from "drizzle-orm";
import { testClient } from "hono/testing";
import { JPEG, stored } from "../test/fake-photos";
import { app } from "./app";
import { db } from "./db";
import { notes } from "./db/schema";

const client = testClient(app);

beforeEach(async () => {
  await db.delete(notes);
});

// What a browser sends for a locked letter: "v1.<16-character iv>.<sealed words>".
// The server never sees the real words, so these tests never need them either.
const box = (sealed = "Ab3-xYz_0123456789abcdefghijk") => `v1.QUJDREVGR0hJSktM.${sealed}`;

async function writeLocked(description = box()) {
  return client.api.notes.$post({
    json: { title: "For Didi", description, recipient: "Didi", locked: true },
  });
}

// The route's type only lists its success (201); a refusal arrives as a thrown error,
// so TypeScript needs telling that any status number may come back.
const statusOf = (res: { status: number }) => res.status;

async function lockedNote() {
  const res = await writeLocked();
  expect(res.status).toBe(201);
  return res.json();
}

const shareOf = async (id: string, burnAfterReading = false) => {
  const res = await client.api.notes[":id"].share.$post({
    param: { id },
    json: { burnAfterReading },
  });
  const { shareToken } = await res.json();
  if (!shareToken) throw new Error("Expected a share token");
  return shareToken;
};

describe("writing a locked letter", () => {
  test("the server keeps the box exactly as it came, and says it is locked", async () => {
    const note = await lockedNote();

    expect(note.locked).toBe(true);
    const [row] = await db.select().from(notes).where(eq(notes.id, note.id));
    expect(row?.description).toBe(box());
    expect(row?.locked).toBe(true);
  });

  test("plain letters stay plain unless they ask", async () => {
    const res = await client.api.notes.$post({ json: { title: "Hi", description: "Plain words" } });

    expect((await res.json()).locked).toBe(false);
  });

  test("words that claim to be locked but are not a box are refused", async () => {
    for (const description of [
      "Dear Didi, plain words",
      "v1.short.x",
      "v2.QUJDREVGR0hJSktM.abcdefghijklmnopqrstuvwxyz",
    ]) {
      expect(statusOf(await writeLocked(description))).toBe(400);
    }
  });

  test("a box larger than any 5000-character letter could make is refused", async () => {
    const tooBig = box("a".repeat(MAX_LOCKED_BOX));

    expect(statusOf(await writeLocked(tooBig))).toBe(400);
  });

  test("a plain letter still has its 5000-character limit", async () => {
    const res = await client.api.notes.$post({
      json: { title: "Long", description: "a".repeat(5001) },
    });

    expect(statusOf(res)).toBe(400);
  });
});

describe("a locked letter stays locked", () => {
  test("editing it with a new box works", async () => {
    const note = await lockedNote();
    const res = await client.api.notes[":id"].$put({
      param: { id: note.id },
      json: { title: "For Didi", description: box("NewSealedWords0123456789"), locked: true },
    });

    expect(res.status).toBe(200);
  });

  test("it can never be turned back into readable words", async () => {
    const note = await lockedNote();
    const res = await client.api.notes[":id"].$put({
      param: { id: note.id },
      json: { title: "For Didi", description: "Now everyone can read this", locked: false },
    });

    expect(res.status).toBe(409);
    const [row] = await db.select().from(notes).where(eq(notes.id, note.id));
    expect(row?.description).toBe(box());
  });

  test("and a plain letter cannot be locked later", async () => {
    const created = await client.api.notes.$post({ json: { title: "Hi", description: "Plain" } });
    const { id } = await created.json();
    const res = await client.api.notes[":id"].$put({
      param: { id },
      json: { title: "Hi", description: box(), locked: true },
    });

    expect(res.status).toBe(409);
  });

  test("it cannot hold a photo, not even one already sitting in storage", async () => {
    const note = await lockedNote();
    const slip = await client.api.notes[":id"].photo["upload-url"].$post({
      param: { id: note.id },
      json: { size: 1000 },
    });
    // A real JPEG placed in storage the hard way, as if someone uploaded it anyway.
    const key = `notes/${note.id}/${crypto.randomUUID()}`;
    stored.set(key, JPEG);
    const attach = await client.api.notes[":id"].photo.$put({
      param: { id: note.id },
      json: { key },
    });

    expect(slip.status).toBe(400);
    expect(attach.status).toBe(400);
    const [row] = await db.select().from(notes).where(eq(notes.id, note.id));
    expect(row?.photoKey).toBeNull();
  });
});

describe("sharing a locked letter", () => {
  test("a stranger gets the box and the word 'locked', never the words", async () => {
    const note = await lockedNote();
    const token = await shareOf(note.id);

    const res = await client.api.shared[":token"].$get({ param: { token } });
    const letter = await res.json();

    expect(letter).toMatchObject({ state: "open", locked: true, description: box() });
  });

  test("a burn letter says it is locked before anyone opens it", async () => {
    const note = await lockedNote();
    const token = await shareOf(note.id, true);

    const envelope = await (await client.api.shared[":token"].$get({ param: { token } })).json();
    expect(envelope).toMatchObject({ state: "ready-to-burn", locked: true });

    const opened = await (
      await client.api.shared[":token"].open.$post({ param: { token } })
    ).json();
    expect(opened).toMatchObject({ locked: true, description: box() });
    const [row] = await db.select().from(notes).where(eq(notes.id, note.id));
    expect(row?.description).toBe("");
  });
});
