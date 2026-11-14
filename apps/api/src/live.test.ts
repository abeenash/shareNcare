import { afterAll, describe, expect, test } from "bun:test";
import { websocket } from "@hono/bun";
import { BOARD_GONE, type LiveMessage, WRITING_FADES_AFTER } from "@sharencare/shared";
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

async function postNote(token: string, writer: string) {
  const res = await guest.notes.$post({ param: { token }, json: { message: "Hi!" } }, as(writer));
  return (await res.json()) as { id: string };
}

// Opens a live line the way a page on our site would, and writes down what it hears.
// `who` plays a signed-in person (the fake session in test/setup.ts reads x-test-user).
function listen(token: string, { origin = OUR_SITE, who }: { origin?: string; who?: string } = {}) {
  const url = `ws://localhost:${server.port}/api/shared-boards/${token}/live`;
  const headers: Record<string, string> = { origin };
  if (who) headers["x-test-user"] = who;
  const socket = new WebSocket(url, { headers });

  const heard: LiveMessage[] = [];
  socket.onmessage = (event) => heard.push(JSON.parse(String(event.data)));
  const opened = new Promise<boolean>((resolve) => {
    socket.onopen = () => resolve(true);
    socket.onerror = () => resolve(false);
  });
  const closedWith = new Promise<number>((resolve) => {
    socket.onclose = (event) => resolve(event.code);
  });

  return {
    socket,
    opened,
    closedWith,
    changes: () => heard.filter((m) => m.type === "changed").length,
    // The latest headcount and writer list this page has heard.
    here: () => heard.findLast((m) => m.type === "here")?.count,
    writers: () => heard.findLast((m) => m.type === "writing")?.names,
    writingNews: () => heard.filter((m) => m.type === "writing").length,
    say: (text: string) => socket.send(text),
  };
}

// Messages travel over a real connection, so give them a moment to arrive.
async function waitFor(check: () => boolean) {
  for (let tries = 0; tries < 200 && !check(); tries++) await Bun.sleep(10);
  return check();
}

async function openOn(token: string, boardId: string, who?: string) {
  const before = watcherCount(boardId);
  const line = listen(token, { who });
  expect(await line.opened).toBe(true);
  await waitFor(() => watcherCount(boardId) === before + 1);
  return line;
}

describe("the live line to a board", () => {
  test("a reader hears 'changed' when a note is posted, and only then", async () => {
    const board = await newBoard();
    const reader = await openOn(board.token, board.id);
    expect(reader.changes()).toBe(0);

    await postNote(board.token, "bob");

    expect(await waitFor(() => reader.changes() === 1)).toBe(true);
    reader.socket.close();
  });

  test("the owner hiding a note or closing the board is heard too", async () => {
    const board = await newBoard();
    const note = await postNote(board.token, "bob");
    const reader = await openOn(board.token, board.id);

    await client.api.boards[":id"].notes[":noteId"].$patch(
      { param: { id: board.id, noteId: note.id }, json: { hidden: true } },
      as("alice"),
    );
    await client.api.boards[":id"].$patch(
      { param: { id: board.id }, json: { open: false } },
      as("alice"),
    );

    expect(await waitFor(() => reader.changes() === 2)).toBe(true);
    reader.socket.close();
  });

  test("reports say nothing, until the one that hides the note", async () => {
    const board = await newBoard();
    const note = await postNote(board.token, "bob");
    const reader = await openOn(board.token, board.id);

    const reportFrom = (ip: string) =>
      guest.notes[":noteId"].report.$post(
        { param: { token: board.token, noteId: note.id } },
        { headers: { "x-test-ip": ip } },
      );
    await reportFrom("10.0.0.1");
    await reportFrom("10.0.0.2");
    await Bun.sleep(50);
    expect(reader.changes()).toBe(0);

    await reportFrom("10.0.0.3");
    expect(await waitFor(() => reader.changes() === 1)).toBe(true);

    // A fourth report finds the note already hidden, so again nothing to say.
    await reportFrom("10.0.0.4");
    await Bun.sleep(50);
    expect(reader.changes()).toBe(1);
    reader.socket.close();
  });

  test("a new link hangs up on everyone who came in through the old one", async () => {
    const board = await newBoard();
    const reader = await openOn(board.token, board.id);

    await client.api.boards[":id"]["new-link"].$post({ param: { id: board.id } }, as("alice"));

    expect(await reader.closedWith).toBe(BOARD_GONE);
    expect(await waitFor(() => watcherCount(board.id) === 0)).toBe(true);
    const lateComer = listen(board.token);
    expect(await lateComer.opened).toBe(false);
  });

  test("deleting the board hangs up too", async () => {
    const board = await newBoard();
    const reader = await openOn(board.token, board.id);

    await client.api.boards[":id"].$delete({ param: { id: board.id } }, as("alice"));

    expect(await reader.closedWith).toBe(BOARD_GONE);
  });

  test("a page on another site cannot listen in", async () => {
    const board = await newBoard();
    const stranger = listen(board.token, { origin: "https://elsewhere.example" });

    expect(await stranger.opened).toBe(false);
    expect(watcherCount(board.id)).toBe(0);
  });

  test("a link to no board cannot be listened to", async () => {
    const nobody = listen("AAAAAAAAAAAAAAAAAAAAAA");

    expect(await nobody.opened).toBe(false);
  });
});

describe("who is here", () => {
  test("everyone hears the headcount go up and down", async () => {
    const board = await newBoard();
    const first = await openOn(board.token, board.id);
    expect(await waitFor(() => first.here() === 1)).toBe(true);

    const second = await openOn(board.token, board.id);
    expect(await waitFor(() => first.here() === 2)).toBe(true);
    expect(await waitFor(() => second.here() === 2)).toBe(true);

    second.socket.close();
    expect(await waitFor(() => first.here() === 1)).toBe(true);
    first.socket.close();
    expect(await waitFor(() => watcherCount(board.id) === 0)).toBe(true);
  });
});

describe("who is writing", () => {
  test("others see a signed-in writer's first name; the writer does not see their own", async () => {
    const board = await newBoard();
    const reader = await openOn(board.token, board.id);
    const bob = await openOn(board.token, board.id, "bob");

    bob.say(JSON.stringify({ type: "writing" }));

    expect(await waitFor(() => reader.writers()?.[0] === "bob")).toBe(true);
    expect(bob.writers()).toEqual([]);
    reader.socket.close();
    bob.socket.close();
  });

  test("the same person typing in two tabs is one name", async () => {
    const board = await newBoard();
    const reader = await openOn(board.token, board.id);
    const tab1 = await openOn(board.token, board.id, "bob");
    const tab2 = await openOn(board.token, board.id, "bob");

    tab1.say(JSON.stringify({ type: "writing" }));
    tab2.say(JSON.stringify({ type: "writing" }));
    await waitFor(() => reader.writers()?.length === 1);
    await Bun.sleep(50);

    expect(reader.writers()).toEqual(["bob"]);
    for (const line of [reader, tab1, tab2]) line.socket.close();
  });

  test("typing on is not news: only starting to type is told", async () => {
    const board = await newBoard();
    const reader = await openOn(board.token, board.id);
    const bob = await openOn(board.token, board.id, "bob");
    await Bun.sleep(50);
    const before = reader.writingNews();

    for (let key = 0; key < 20; key++) bob.say(JSON.stringify({ type: "writing" }));
    await waitFor(() => reader.writers()?.length === 1);
    await Bun.sleep(100);

    expect(reader.writingNews()).toBe(before + 1);
    reader.socket.close();
    bob.socket.close();
  });

  test("someone not signed in cannot appear as writing", async () => {
    const board = await newBoard();
    const reader = await openOn(board.token, board.id);
    const stranger = await openOn(board.token, board.id);
    await Bun.sleep(50);
    const before = reader.writingNews();

    stranger.say(JSON.stringify({ type: "writing" }));
    await Bun.sleep(100);

    // Not even an empty "writing" message: a stranger cannot make the server talk.
    expect(reader.writingNews()).toBe(before);
    expect(reader.writers()).toEqual([]);
    reader.socket.close();
    stranger.socket.close();
  });

  test("anything else a browser sends is ignored, and the line stays open", async () => {
    const board = await newBoard();
    const reader = await openOn(board.token, board.id);
    const bob = await openOn(board.token, board.id, "bob");

    for (const junk of ["hello", "{}", '{"type":"changed"}', '{"type":"writing"', "[1,2,3]"]) {
      bob.say(junk);
    }
    bob.socket.send(new Uint8Array([1, 2, 3]));
    await Bun.sleep(100);

    expect(reader.writers()).toEqual([]);
    expect(reader.changes()).toBe(0);
    expect(bob.socket.readyState).toBe(WebSocket.OPEN);
    reader.socket.close();
    bob.socket.close();
  });

  test("posting the note ends 'writing' at once", async () => {
    const board = await newBoard();
    const reader = await openOn(board.token, board.id);
    const bob = await openOn(board.token, board.id, "bob");
    bob.say(JSON.stringify({ type: "writing" }));
    await waitFor(() => reader.writers()?.length === 1);

    await postNote(board.token, "bob");

    expect(await waitFor(() => reader.writers()?.length === 0)).toBe(true);
    expect(reader.changes()).toBe(1);
    reader.socket.close();
    bob.socket.close();
  });

  test("leaving the page ends 'writing' at once", async () => {
    const board = await newBoard();
    const reader = await openOn(board.token, board.id);
    const bob = await openOn(board.token, board.id, "bob");
    bob.say(JSON.stringify({ type: "writing" }));
    await waitFor(() => reader.writers()?.length === 1);

    bob.socket.close();

    expect(await waitFor(() => reader.writers()?.length === 0)).toBe(true);
    reader.socket.close();
  });

  test(
    "'writing' fades by itself when the typing stops",
    async () => {
      const board = await newBoard();
      const reader = await openOn(board.token, board.id);
      const bob = await openOn(board.token, board.id, "bob");
      bob.say(JSON.stringify({ type: "writing" }));
      await waitFor(() => reader.writers()?.length === 1);

      await Bun.sleep(WRITING_FADES_AFTER - 1000);
      expect(reader.writers()).toEqual(["bob"]);
      await Bun.sleep(1500);
      expect(reader.writers()).toEqual([]);
      reader.socket.close();
      bob.socket.close();
    },
    { timeout: WRITING_FADES_AFTER + 5000 },
  );
});
