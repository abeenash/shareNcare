import { beforeEach, describe, expect, test } from "bun:test";
import { testClient } from "hono/testing";
import { app } from "./app";
import { db } from "./db";
import { notes } from "./db/schema";

const client = testClient(app);
const asBob = { headers: { "x-test-user": "bob" } };

beforeEach(async () => {
  await db.delete(notes);
});

async function aliceWrites(recipient?: string) {
  const res = await client.api.notes.$post({
    json: {
      title: "For you",
      description: "Thank you for everything",
      recipient,
    },
  });
  return res.json();
}

async function shareLink(id: string) {
  const res = await client.api.notes[":id"].share.$post({ param: { id } });
  expect(res.status).toBe(200);
  const { shareToken } = await res.json();
  if (!shareToken) throw new Error("Expected a share token");
  return shareToken;
}

const openAsStranger = (token: string) => client.api.shared[":token"].$get({ param: { token } });

describe("the To field", () => {
  test("is trimmed, and an empty name means just for you", async () => {
    expect((await aliceWrites("  Didi  ")).recipient).toBe("Didi");
    expect((await aliceWrites("")).recipient).toBeNull();
    expect((await aliceWrites()).recipient).toBeNull();
  });
});

describe("share links", () => {
  test("a link is 22 URL-safe characters, and sharing twice keeps the same link", async () => {
    const note = await aliceWrites("Didi");
    const first = await shareLink(note.id);
    const second = await shareLink(note.id);

    expect(first).toMatch(/^[\w-]{22}$/);
    expect(second).toBe(first);
  });

  test("a stranger sees the letter, and nothing else", async () => {
    const note = await aliceWrites("Didi");
    const token = await shareLink(note.id);

    const res = await openAsStranger(token);
    expect(res.status).toBe(200);
    const letter = await res.json();

    expect(letter).toMatchObject({ title: "For you", recipient: "Didi", from: "Alice" });
    expect(Object.keys(letter).sort()).toEqual([
      "createdAt",
      "description",
      "from",
      "recipient",
      "title",
    ]);
  });

  test("only the owner can share a note", async () => {
    const note = await aliceWrites();
    const res = await client.api.notes[":id"].share.$post({ param: { id: note.id } }, asBob);
    expect(res.status).toBe(404);
  });

  test("stopping sharing kills the link", async () => {
    const note = await aliceWrites();
    const token = await shareLink(note.id);

    const stop = await client.api.notes[":id"].share.$delete({ param: { id: note.id } });
    expect(stop.status).toBe(200);
    expect((await stop.json()).shareToken).toBeNull();

    expect((await openAsStranger(token)).status).toBe(404);
  });

  test("a note in the trash cannot be opened by its link", async () => {
    const note = await aliceWrites();
    const token = await shareLink(note.id);
    await client.api.notes[":id"].$delete({ param: { id: note.id } });

    expect((await openAsStranger(token)).status).toBe(404);
  });

  test("an unknown link is 404, a malformed link is 400", async () => {
    expect((await openAsStranger("A".repeat(22))).status).toBe(404);
    expect((await openAsStranger("short")).status).toBe(400);
  });
});
