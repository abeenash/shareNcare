import { beforeAll, beforeEach, describe, expect, test } from "bun:test";
import { BOARD_NOTE_LIMIT } from "@sharencare/shared";
import { eq } from "drizzle-orm";
import { testClient } from "hono/testing";
import { app } from "./app";
import { db } from "./db";
import { boardNotes, boardReports, boards, user } from "./db/schema";

const client = testClient(app);
const as = (id: string) => ({ headers: { "x-test-user": id } });
const asBob = as("bob");
const fromIp = (ip: string) => ({ headers: { "x-test-ip": ip } });

const guest = client.api["shared-boards"][":token"];

// Alice and Bob come from test/setup.ts. Two more writers for these tests.
beforeAll(async () => {
  const now = new Date();
  await db
    .insert(user)
    .values(
      ["carol", "dave"].map((id) => ({
        id,
        name: id,
        email: `${id}@test.dev`,
        createdAt: now,
        updatedAt: now,
      })),
    )
    .onConflictDoNothing();
});

beforeEach(async () => {
  await db.delete(boards);
});

async function newBoard(options?: typeof asBob) {
  const res = await client.api.boards.$post(
    { json: { title: "Farewell, Didi", recipient: "Didi" } },
    options,
  );
  return res.json();
}

async function post(token: string, writer = "alice", message = "We will miss you!") {
  const res = await guest.notes.$post({ param: { token }, json: { message } }, as(writer));
  return res.json() as Promise<{ id: string }>;
}

const look = async (token: string, viewer?: string) =>
  (await guest.$get({ param: { token } }, viewer ? as(viewer) : undefined)).json();

const report = (token: string, noteId: string, ip: string) =>
  guest.notes[":noteId"].report.$post({ param: { token, noteId } }, fromIp(ip));

describe("the owner's board", () => {
  test("creating a board gives it a 22-character link", async () => {
    const board = await newBoard();

    expect(board.token).toMatch(/^[\w-]{22}$/);
    expect(board.closedAt).toBeNull();
  });

  test("my boards list shows how many notes each has", async () => {
    const board = await newBoard();
    await post(board.token, "alice");
    await post(board.token, "bob");

    const res = await client.api.boards.$get();

    expect(await res.json()).toMatchObject([{ title: "Farewell, Didi", noteCount: 2 }]);
  });

  test("Bob cannot see, change or delete Alice's board", async () => {
    const board = await newBoard();
    const param = { param: { id: board.id } };

    const list = await client.api.boards.$get(undefined, asBob);
    const view = await client.api.boards[":id"].$get(param, asBob);
    const close = await client.api.boards[":id"].$patch({ ...param, json: { open: false } }, asBob);
    const relink = await client.api.boards[":id"]["new-link"].$post(param, asBob);
    const remove = await client.api.boards[":id"].$delete(param, asBob);

    expect(await list.json()).toEqual([]);
    expect([view.status, close.status, relink.status, remove.status]).toEqual([404, 404, 404, 404]);
  });

  test("Bob cannot hide or delete notes on Alice's board", async () => {
    const board = await newBoard();
    const note = await post(board.token, "carol");
    const param = { param: { id: board.id, noteId: note.id } };

    const hide = await client.api.boards[":id"].notes[":noteId"].$patch(
      { ...param, json: { hidden: true } },
      asBob,
    );
    const remove = await client.api.boards[":id"].notes[":noteId"].$delete(param, asBob);

    expect([hide.status, remove.status]).toEqual([404, 404]);
    expect(await db.select().from(boardNotes)).toHaveLength(1);
  });

  test("a note from one board cannot be moderated through another board", async () => {
    const mine = await newBoard();
    const other = await newBoard();
    const note = await post(other.token, "carol");

    const res = await client.api.boards[":id"].notes[":noteId"].$delete({
      param: { id: mine.id, noteId: note.id },
    });

    expect(res.status).toBe(404);
  });

  test("the owner sees hidden notes and report counts, but never account ids", async () => {
    const board = await newBoard();
    const note = await post(board.token, "carol");
    await report(board.token, note.id, "10.0.0.1");
    await client.api.boards[":id"].notes[":noteId"].$patch({
      param: { id: board.id, noteId: note.id },
      json: { hidden: true },
    });

    const res = await client.api.boards[":id"].$get({ param: { id: board.id } });
    const body = await res.json();

    expect(body.notes).toMatchObject([{ id: note.id, authorName: "carol", reportCount: 1 }]);
    expect(body.notes[0]?.hiddenAt).not.toBeNull();
    expect(JSON.stringify(body)).not.toContain("authorId");
  });

  test("closing stops new notes, and reopening allows them again", async () => {
    const board = await newBoard();
    const toggle = (open: boolean) =>
      client.api.boards[":id"].$patch({ param: { id: board.id }, json: { open } });

    await toggle(false);
    const whileClosed = await guest.notes.$post(
      { param: { token: board.token }, json: { message: "Too late?" } },
      as("carol"),
    );
    const view = await look(board.token);
    await toggle(true);
    const afterReopen = await guest.notes.$post(
      { param: { token: board.token }, json: { message: "Just in time" } },
      as("carol"),
    );

    // A thrown 403 is not in Hono's types, which only know the statuses a route returns.
    expect(whileClosed.status as number).toBe(403);
    expect(view).toMatchObject({ open: false });
    expect(afterReopen.status).toBe(201);
  });

  test("a new link kills the old one, and the notes move with the board", async () => {
    const board = await newBoard();
    await post(board.token, "carol");

    const res = await client.api.boards[":id"]["new-link"].$post({ param: { id: board.id } });
    const { token } = await res.json();

    expect(token).not.toBe(board.token);
    expect((await guest.$get({ param: { token: board.token } })).status).toBe(404);
    expect(await look(token)).toMatchObject({ notes: [{ message: "We will miss you!" }] });
  });

  test("deleting a board deletes its notes and reports too", async () => {
    const board = await newBoard();
    const note = await post(board.token, "carol");
    await report(board.token, note.id, "10.0.0.1");

    await client.api.boards[":id"].$delete({ param: { id: board.id } });

    expect(await db.select().from(boardNotes)).toEqual([]);
    expect(await db.select().from(boardReports)).toEqual([]);
  });
});

describe("visitors and writers", () => {
  test("a wrong link is 404, and a malformed one is 400", async () => {
    const unknown = await guest.$get({ param: { token: "AAAAAAAAAAAAAAAAAAAAAA" } });
    const malformed = await guest.$get({ param: { token: "short" } });

    expect([unknown.status, malformed.status]).toEqual([404, 400]);
  });

  test("anyone with the link can read, without signing in", async () => {
    const board = await newBoard();
    await post(board.token, "carol", "First!");

    expect(await look(board.token)).toEqual({
      title: "Farewell, Didi",
      recipient: "Didi",
      from: "Alice",
      open: true,
      signedIn: false,
      yourNote: null,
      notes: [expect.objectContaining({ authorName: "carol", message: "First!", mine: false })],
    });
  });

  test("writing a note needs an account", async () => {
    const board = await newBoard();

    const res = await app.request(`/api/shared-boards/${board.token}/notes`, {
      method: "POST",
      headers: { "content-type": "application/json", "x-test-user": "nobody" },
      body: JSON.stringify({ message: "Hello" }),
    });

    expect(res.status).toBe(401);
    expect(await db.select().from(boardNotes)).toEqual([]);
  });

  test("the name on a note comes from the account, not from the request", async () => {
    const board = await newBoard();

    await app.request(`/api/shared-boards/${board.token}/notes`, {
      method: "POST",
      headers: { "content-type": "application/json", "x-test-user": "dave" },
      body: JSON.stringify({ message: "Hi", authorName: "Someone famous" }),
    });

    const [row] = await db.select().from(boardNotes);
    expect(row?.authorName).toBe("dave");
    expect(row?.authorId).toBe("dave");
  });

  test("one person gets one note per board", async () => {
    const board = await newBoard();
    const other = await newBoard();

    const first = await guest.notes.$post(
      { param: { token: board.token }, json: { message: "One" } },
      as("carol"),
    );
    const second = await guest.notes.$post(
      { param: { token: board.token }, json: { message: "Two" } },
      as("carol"),
    );
    const elsewhere = await guest.notes.$post(
      { param: { token: other.token }, json: { message: "Different board" } },
      as("carol"),
    );

    expect(first.status).toBe(201);
    expect(second.status as number).toBe(409);
    expect(await second.json()).toMatchObject({
      error: { code: "CONFLICT", message: "You already have a note on this board" },
    });
    expect(elsewhere.status).toBe(201);
  });

  test("the writer sees their note marked as theirs, and nobody else does", async () => {
    const board = await newBoard();
    const note = await post(board.token, "carol");

    const forCarol = await look(board.token, "carol");
    const forDave = await look(board.token, "dave");

    expect(forCarol).toMatchObject({
      signedIn: true,
      yourNote: { id: note.id, hidden: false },
      notes: [{ id: note.id, mine: true }],
    });
    expect(forDave).toMatchObject({ signedIn: true, yourNote: null, notes: [{ mine: false }] });
    expect(JSON.stringify(forCarol)).not.toContain("authorId");
  });

  test("a hidden note is gone from the board, but its writer is told why", async () => {
    const board = await newBoard();
    const note = await post(board.token, "carol");
    await client.api.boards[":id"].notes[":noteId"].$patch({
      param: { id: board.id, noteId: note.id },
      json: { hidden: true },
    });

    const forCarol = await look(board.token, "carol");

    expect(forCarol).toMatchObject({ notes: [], yourNote: { id: note.id, hidden: true } });
  });

  test("only the writer can delete their note", async () => {
    const board = await newBoard();
    const note = await post(board.token, "carol");
    const remove = (writer: string) =>
      app.request(`/api/shared-boards/${board.token}/notes/${note.id}`, {
        method: "DELETE",
        headers: { "x-test-user": writer },
      });

    const anonymous = await remove("nobody");
    const dave = await remove("dave");
    const carol = await remove("carol");

    expect([anonymous.status, dave.status, carol.status]).toEqual([401, 404, 200]);
    expect(await db.select().from(boardNotes)).toEqual([]);
  });

  test("an older note with no author still shows, and belongs to nobody", async () => {
    const board = await newBoard();
    const [old] = await db
      .insert(boardNotes)
      .values({ boardId: board.id, authorName: "Asha", message: "Written before sign-in" })
      .returning({ id: boardNotes.id });
    if (!old) throw new Error("Insert returned no row");

    const view = await look(board.token, "alice");
    const remove = await app.request(`/api/shared-boards/${board.token}/notes/${old.id}`, {
      method: "DELETE",
      headers: { "x-test-user": "alice" },
    });

    expect(view).toMatchObject({ yourNote: null, notes: [{ authorName: "Asha", mine: false }] });
    expect(remove.status).toBe(404);
  });

  test("empty messages, long messages and made-up colours are refused", async () => {
    const board = await newBoard();
    const send = (json: Record<string, string>) =>
      app.request(`/api/shared-boards/${board.token}/notes`, {
        method: "POST",
        headers: { "content-type": "application/json", "x-test-user": "carol" },
        body: JSON.stringify(json),
      });

    const empty = await send({ message: "  " });
    const tooLong = await send({ message: "a".repeat(501) });
    const badColour = await send({ message: "Hi", color: "black" });

    expect([empty.status, tooLong.status, badColour.status]).toEqual([400, 400, 400]);
  });

  test(`a board stops taking notes at ${BOARD_NOTE_LIMIT}`, async () => {
    const board = await newBoard();
    await db.insert(boardNotes).values(
      Array.from({ length: BOARD_NOTE_LIMIT }, (_, i) => ({
        boardId: board.id,
        authorName: "Bot",
        message: `Note ${i}`,
      })),
    );

    const res = await guest.notes.$post(
      { param: { token: board.token }, json: { message: "One more" } },
      as("carol"),
    );

    expect(res.status as number).toBe(403);
    expect(await res.json()).toMatchObject({ error: { message: "This board is full" } });
  });
});

describe("reports", () => {
  test("three different people hide a note; it stays visible before that", async () => {
    const board = await newBoard();
    const note = await post(board.token, "carol", "Something nasty");
    const visible = async () => (await look(board.token)).notes.length;

    await report(board.token, note.id, "10.0.0.1");
    await report(board.token, note.id, "10.0.0.2");
    const afterTwo = await visible();
    await report(board.token, note.id, "10.0.0.3");

    expect(afterTwo).toBe(1);
    expect(await visible()).toBe(0);
  });

  test("one person reporting three times counts once", async () => {
    const board = await newBoard();
    const note = await post(board.token, "carol");

    for (let i = 0; i < 3; i++) await report(board.token, note.id, "10.0.0.1");

    expect(await db.select().from(boardReports)).toHaveLength(1);
    const [row] = await db.select().from(boardNotes).where(eq(boardNotes.id, note.id));
    expect(row?.hiddenAt).toBeNull();
  });

  test("reports store a fingerprint, never the address", async () => {
    const board = await newBoard();
    const note = await post(board.token, "carol");

    await report(board.token, note.id, "203.0.113.7");

    const [row] = await db.select().from(boardReports);
    expect(row?.reporterHash).toHaveLength(64);
    expect(row?.reporterHash).not.toContain("203.0.113.7");
  });

  test("a note can only be reported through its own board's link", async () => {
    const board = await newBoard();
    const other = await newBoard();
    const note = await post(other.token, "carol");

    const res = await report(board.token, note.id, "10.0.0.1");

    expect(res.status).toBe(404);
  });

  test("bringing a note back clears its reports, so it starts fresh", async () => {
    const board = await newBoard();
    const note = await post(board.token, "carol");
    for (const ip of ["10.0.0.1", "10.0.0.2", "10.0.0.3"]) await report(board.token, note.id, ip);

    await client.api.boards[":id"].notes[":noteId"].$patch({
      param: { id: board.id, noteId: note.id },
      json: { hidden: false },
    });
    await report(board.token, note.id, "10.0.0.4");

    expect((await look(board.token)).notes).toHaveLength(1);
    expect(await db.select().from(boardReports)).toHaveLength(1);
  });

  test("the answer never says how many reports there are", async () => {
    const board = await newBoard();
    const note = await post(board.token, "carol");

    const first = await (await report(board.token, note.id, "10.0.0.1")).json();
    const again = await (await report(board.token, note.id, "10.0.0.1")).json();

    expect(first).toEqual({ reported: true });
    expect(again).toEqual({ reported: true });
  });
});
