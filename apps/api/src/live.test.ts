import { afterAll, describe, expect, test } from "bun:test";
import { websocket } from "@hono/bun";
import { BOARD_CHANGED, BOARD_GONE } from "@sharencare/shared";
import { testClient } from "hono/testing";
import { app } from "./app";
import { watcherCount } from "./lib/live-boards";

// A WebSocket needs a real connection, so these tests start a real server on a
// free port (port 0 means "any free one"). Writes still go through testClient.
const server = Bun.serve({ port: 0, fetch: app.fetch, websocket });
afterAll(() => server.stop(true));

const client = testClient(app);
const as = (id: string) => ({ headers: { "x-test-user": id } });
const guest = client.api["shared-boards"][":token"];
const OUR_SITE = "http://localhost:5173"; // BETTER_AUTH_URL in test/setup.ts

async function newBoard() {
  const res = await client.api.boards.$post(
    { json: { title: "Farewell, Didi", recipient: "Didi" } },
    as("alice"),
  );
  return res.json();
}

// Opens a live line the way a page on our site would, and writes down what it hears.
function listen(token: string, origin = OUR_SITE) {
  const url = `ws://localhost:${server.port}/api/shared-boards/${token}/live`;
  const socket = new WebSocket(url, { headers: { origin } });
  const heard: string[] = [];
  socket.onmessage = (event) => heard.push(String(event.data));
  const opened = new Promise<boolean>((resolve) => {
    socket.onopen = () => resolve(true);
    socket.onerror = () => resolve(false);
  });
  const closedWith = new Promise<number>((resolve) => {
    socket.onclose = (event) => resolve(event.code);
  });
  return { socket, heard, opened, closedWith };
}

// Messages travel over a real connection, so give them a moment to arrive.
async function waitFor(check: () => boolean) {
  for (let tries = 0; tries < 200 && !check(); tries++) await Bun.sleep(10);
  return check();
}

describe("the live line to a board", () => {
  test("a reader hears 'changed' when a note is posted, and only then", async () => {
    const board = await newBoard();
    const reader = listen(board.token);
    expect(await reader.opened).toBe(true);
    expect(await waitFor(() => watcherCount(board.id) === 1)).toBe(true);
    expect(reader.heard).toEqual([]);

    await guest.notes.$post({ param: { token: board.token }, json: { message: "Hi!" } }, as("bob"));

    expect(await waitFor(() => reader.heard.length === 1)).toBe(true);
    expect(reader.heard).toEqual([BOARD_CHANGED]);
    reader.socket.close();
  });

  test("the owner hiding a note or closing the board is heard too", async () => {
    const board = await newBoard();
    const res = await guest.notes.$post(
      { param: { token: board.token }, json: { message: "Hi!" } },
      as("bob"),
    );
    const note = (await res.json()) as { id: string };
    const reader = listen(board.token);
    await reader.opened;
    await waitFor(() => watcherCount(board.id) === 1);

    await client.api.boards[":id"].notes[":noteId"].$patch(
      { param: { id: board.id, noteId: note.id }, json: { hidden: true } },
      as("alice"),
    );
    await client.api.boards[":id"].$patch(
      { param: { id: board.id }, json: { open: false } },
      as("alice"),
    );

    expect(await waitFor(() => reader.heard.length === 2)).toBe(true);
    reader.socket.close();
  });

  test("reports say nothing, until the one that hides the note", async () => {
    const board = await newBoard();
    const res = await guest.notes.$post(
      { param: { token: board.token }, json: { message: "Hi!" } },
      as("bob"),
    );
    const note = (await res.json()) as { id: string };
    const reader = listen(board.token);
    await reader.opened;
    await waitFor(() => watcherCount(board.id) === 1);

    const reportFrom = (ip: string) =>
      guest.notes[":noteId"].report.$post(
        { param: { token: board.token, noteId: note.id } },
        { headers: { "x-test-ip": ip } },
      );
    await reportFrom("10.0.0.1");
    await reportFrom("10.0.0.2");
    await Bun.sleep(50);
    expect(reader.heard).toEqual([]);

    await reportFrom("10.0.0.3");
    expect(await waitFor(() => reader.heard.length === 1)).toBe(true);

    // A fourth report finds the note already hidden, so again nothing to say.
    await reportFrom("10.0.0.4");
    await Bun.sleep(50);
    expect(reader.heard).toEqual([BOARD_CHANGED]);
    reader.socket.close();
  });

  test("a new link hangs up on everyone who came in through the old one", async () => {
    const board = await newBoard();
    const reader = listen(board.token);
    await reader.opened;
    await waitFor(() => watcherCount(board.id) === 1);

    await client.api.boards[":id"]["new-link"].$post({ param: { id: board.id } }, as("alice"));

    expect(await reader.closedWith).toBe(BOARD_GONE);
    expect(await waitFor(() => watcherCount(board.id) === 0)).toBe(true);
    const lateComer = listen(board.token);
    expect(await lateComer.opened).toBe(false);
  });

  test("deleting the board hangs up too", async () => {
    const board = await newBoard();
    const reader = listen(board.token);
    await reader.opened;
    await waitFor(() => watcherCount(board.id) === 1);

    await client.api.boards[":id"].$delete({ param: { id: board.id } }, as("alice"));

    expect(await reader.closedWith).toBe(BOARD_GONE);
  });

  test("closing the page stops the watching", async () => {
    const board = await newBoard();
    const reader = listen(board.token);
    await reader.opened;
    expect(await waitFor(() => watcherCount(board.id) === 1)).toBe(true);

    reader.socket.close();

    expect(await waitFor(() => watcherCount(board.id) === 0)).toBe(true);
  });

  test("a page on another site cannot listen in", async () => {
    const board = await newBoard();
    const stranger = listen(board.token, "https://elsewhere.example");

    expect(await stranger.opened).toBe(false);
    expect(watcherCount(board.id)).toBe(0);
  });

  test("a link to no board cannot be listened to", async () => {
    const nobody = listen("AAAAAAAAAAAAAAAAAAAAAA");

    expect(await nobody.opened).toBe(false);
  });
});
