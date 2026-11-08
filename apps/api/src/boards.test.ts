import { beforeEach, describe, expect, test } from "bun:test";
import { BOARD_NOTE_LIMIT } from "@sharencare/shared";
import { eq } from "drizzle-orm";
import { testClient } from "hono/testing";
import { app } from "./app";
import { db } from "./db";
import { boardNotes, boardReports, boards } from "./db/schema";

const client = testClient(app);
const asBob = { headers: { "x-test-user": "bob" } };
const fromIp = (ip: string) => ({ headers: { "x-test-ip": ip } });

const guest = client.api["shared-boards"][":token"];

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

async function post(token: string, message = "We will miss you!", options?: typeof asBob) {
  const res = await guest.notes.$post(
    { param: { token }, json: { authorName: "Asha", message } },
    options,
  );
  return res.json() as Promise<{ note: { id: string }; guestKey: string }>;
}

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
    await post(board.token);
    await post(board.token);

    const res = await client.api.boards.$get();

    expect(await res.json()).toMatchObject([{ title: "Farewell, Didi", noteCount: 2 }]);
  });

  test("Bob cannot see, change or delete Alice's board", async () => {
    const board = await newBoard();
    const param = { param: { id: board.id } };

    const list = await client.api.boards.$get(undefined, asBob);
    const look = await client.api.boards[":id"].$get(param, asBob);
    const close = await client.api.boards[":id"].$patch({ ...param, json: { open: false } }, asBob);
    const relink = await client.api.boards[":id"]["new-link"].$post(param, asBob);
    const remove = await client.api.boards[":id"].$delete(param, asBob);

    expect(await list.json()).toEqual([]);
    expect([look.status, close.status, relink.status, remove.status]).toEqual([404, 404, 404, 404]);
  });

  test("Bob cannot hide or delete notes on Alice's board", async () => {
    const board = await newBoard();
    const { note } = await post(board.token);
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
    const { note } = await post(other.token);

    const res = await client.api.boards[":id"].notes[":noteId"].$delete({
      param: { id: mine.id, noteId: note.id },
    });

    expect(res.status).toBe(404);
  });

  test("the owner sees hidden notes and report counts, but never a guest key", async () => {
    const board = await newBoard();
    const { note } = await post(board.token);
    await report(board.token, note.id, "10.0.0.1");
    await client.api.boards[":id"].notes[":noteId"].$patch({
      param: { id: board.id, noteId: note.id },
      json: { hidden: true },
    });

    const res = await client.api.boards[":id"].$get({ param: { id: board.id } });
    const body = await res.json();

    expect(body.notes).toMatchObject([{ id: note.id, reportCount: 1 }]);
    expect(body.notes[0]?.hiddenAt).not.toBeNull();
    expect(JSON.stringify(body)).not.toContain("guestKey");
  });

  test("closing stops new notes, and reopening allows them again", async () => {
    const board = await newBoard();
    const toggle = (open: boolean) =>
      client.api.boards[":id"].$patch({ param: { id: board.id }, json: { open } });

    await toggle(false);
    const whileClosed = await guest.notes.$post({
      param: { token: board.token },
      json: { authorName: "Asha", message: "Too late?" },
    });
    const view = await (await guest.$get({ param: { token: board.token } })).json();
    await toggle(true);
    const afterReopen = await guest.notes.$post({
      param: { token: board.token },
      json: { authorName: "Asha", message: "Just in time" },
    });

    // A thrown 403 is not in Hono's types, which only know the statuses a route returns.
    expect(whileClosed.status as number).toBe(403);
    expect(view).toMatchObject({ open: false });
    expect(afterReopen.status).toBe(201);
  });

  test("a new link kills the old one, and the notes move with the board", async () => {
    const board = await newBoard();
    await post(board.token);

    const res = await client.api.boards[":id"]["new-link"].$post({ param: { id: board.id } });
    const { token } = await res.json();

    expect(token).not.toBe(board.token);
    expect((await guest.$get({ param: { token: board.token } })).status).toBe(404);
    expect(await (await guest.$get({ param: { token } })).json()).toMatchObject({
      notes: [{ message: "We will miss you!" }],
    });
  });

  test("deleting a board deletes its notes and reports too", async () => {
    const board = await newBoard();
    const { note } = await post(board.token);
    await report(board.token, note.id, "10.0.0.1");

    await client.api.boards[":id"].$delete({ param: { id: board.id } });

    expect(await db.select().from(boardNotes)).toEqual([]);
    expect(await db.select().from(boardReports)).toEqual([]);
  });
});

describe("a guest with the link", () => {
  test("a wrong link is 404, and a malformed one is 400", async () => {
    const unknown = await guest.$get({ param: { token: "AAAAAAAAAAAAAAAAAAAAAA" } });
    const malformed = await guest.$get({ param: { token: "short" } });

    expect([unknown.status, malformed.status]).toEqual([404, 400]);
  });

  test("sees the board, its notes, and the owner's first name only", async () => {
    const board = await newBoard();
    await post(board.token, "First!");

    const res = await guest.$get({ param: { token: board.token } });

    expect(await res.json()).toMatchObject({
      title: "Farewell, Didi",
      recipient: "Didi",
      from: "Alice",
      open: true,
      notes: [{ authorName: "Asha", message: "First!", color: "yellow" }],
    });
  });

  test("posting returns a 43-character guest key, and only its fingerprint is stored", async () => {
    const board = await newBoard();

    const { note, guestKey } = await post(board.token);
    const [row] = await db.select().from(boardNotes).where(eq(boardNotes.id, note.id));

    expect(guestKey).toMatch(/^[\w-]{43}$/);
    expect(row?.guestKeyHash).toHaveLength(64);
    expect(row?.guestKeyHash).not.toContain(guestKey);
    expect(JSON.stringify(note)).not.toContain("guestKeyHash");
  });

  test("the guest key deletes your own note, and nobody else's", async () => {
    const board = await newBoard();
    const mine = await post(board.token, "Mine");
    const theirs = await post(board.token, "Theirs");
    const remove = (noteId: string, key: string) =>
      guest.notes[":noteId"].$delete({
        param: { token: board.token, noteId },
        header: { "x-guest-key": key },
      });

    const wrongNote = await remove(theirs.note.id, mine.guestKey);
    const madeUpKey = await remove(mine.note.id, "x".repeat(43));
    const right = await remove(mine.note.id, mine.guestKey);

    expect([wrongNote.status, madeUpKey.status, right.status]).toEqual([404, 404, 200]);
    const left = await db.select({ message: boardNotes.message }).from(boardNotes);
    expect(left).toEqual([{ message: "Theirs" }]);
  });

  test("a delete without a key is refused before it reaches the database", async () => {
    const board = await newBoard();
    const { note } = await post(board.token);

    const res = await app.request(`/api/shared-boards/${board.token}/notes/${note.id}`, {
      method: "DELETE",
    });

    expect(res.status).toBe(400);
  });

  test("empty names, long messages and made-up colours are refused", async () => {
    const board = await newBoard();
    const send = (json: Record<string, string>) =>
      app.request(`/api/shared-boards/${board.token}/notes`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(json),
      });

    const noName = await send({ authorName: "  ", message: "Hi" });
    const tooLong = await send({ authorName: "Asha", message: "a".repeat(501) });
    const badColour = await send({ authorName: "Asha", message: "Hi", color: "black" });

    expect([noName.status, tooLong.status, badColour.status]).toEqual([400, 400, 400]);
  });

  test(`a board stops taking notes at ${BOARD_NOTE_LIMIT}`, async () => {
    const board = await newBoard();
    await db.insert(boardNotes).values(
      Array.from({ length: BOARD_NOTE_LIMIT }, (_, i) => ({
        boardId: board.id,
        authorName: "Bot",
        message: `Note ${i}`,
        guestKeyHash: "x",
      })),
    );

    const res = await guest.notes.$post({
      param: { token: board.token },
      json: { authorName: "Asha", message: "One more" },
    });

    expect(res.status as number).toBe(403);
    expect(await res.json()).toMatchObject({ error: { message: "This board is full" } });
  });
});

describe("reports", () => {
  test("three different people hide a note; it stays visible before that", async () => {
    const board = await newBoard();
    const { note } = await post(board.token, "Something nasty");
    const visible = async () =>
      (await (await guest.$get({ param: { token: board.token } })).json()).notes.length;

    await report(board.token, note.id, "10.0.0.1");
    await report(board.token, note.id, "10.0.0.2");
    const afterTwo = await visible();
    await report(board.token, note.id, "10.0.0.3");

    expect(afterTwo).toBe(1);
    expect(await visible()).toBe(0);
  });

  test("one person reporting three times counts once", async () => {
    const board = await newBoard();
    const { note } = await post(board.token);

    for (let i = 0; i < 3; i++) await report(board.token, note.id, "10.0.0.1");

    expect(await db.select().from(boardReports)).toHaveLength(1);
    const [row] = await db.select().from(boardNotes);
    expect(row?.hiddenAt).toBeNull();
  });

  test("reports store a fingerprint, never the address", async () => {
    const board = await newBoard();
    const { note } = await post(board.token);

    await report(board.token, note.id, "203.0.113.7");

    const [row] = await db.select().from(boardReports);
    expect(row?.reporterHash).toHaveLength(64);
    expect(row?.reporterHash).not.toContain("203.0.113.7");
  });

  test("a note can only be reported through its own board's link", async () => {
    const board = await newBoard();
    const other = await newBoard();
    const { note } = await post(other.token);

    const res = await report(board.token, note.id, "10.0.0.1");

    expect(res.status).toBe(404);
  });

  test("bringing a note back clears its reports, so it starts fresh", async () => {
    const board = await newBoard();
    const { note } = await post(board.token);
    for (const ip of ["10.0.0.1", "10.0.0.2", "10.0.0.3"]) await report(board.token, note.id, ip);

    await client.api.boards[":id"].notes[":noteId"].$patch({
      param: { id: board.id, noteId: note.id },
      json: { hidden: false },
    });
    await report(board.token, note.id, "10.0.0.4");

    const view = await (await guest.$get({ param: { token: board.token } })).json();
    expect(view.notes).toHaveLength(1);
    expect(await db.select().from(boardReports)).toHaveLength(1);
  });

  test("the answer never says how many reports there are", async () => {
    const board = await newBoard();
    const { note } = await post(board.token);

    const first = await (await report(board.token, note.id, "10.0.0.1")).json();
    const again = await (await report(board.token, note.id, "10.0.0.1")).json();

    expect(first).toEqual({ reported: true });
    expect(again).toEqual({ reported: true });
  });
});
