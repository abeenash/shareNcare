import { describe, expect, spyOn, test } from "bun:test";
import { testClient } from "hono/testing";
import { captureLogs, type LogEntry } from "../test/capture-logs";
import { fakePhotos } from "../test/fake-photos";
import { app } from "./app";
import { routeForLog } from "./middleware/request-log";

const client = testClient(app);

async function logged<Res>(send: () => Res | Promise<Res>) {
  const logs = captureLogs();
  try {
    const res = await send();
    return { res, lines: logs.lines, entries: logs.entries() };
  } finally {
    logs.stop();
  }
}

const requestLine = (entries: LogEntry[]) => entries.find((entry) => entry.event === "request");

describe("one log line per request", () => {
  test("has the method, the route, the status, the time and the request id", async () => {
    const { res, entries } = await logged(() => client.api.health.$get());

    expect(entries).toHaveLength(1);
    expect(entries[0]).toEqual({
      level: "info",
      event: "request",
      requestId: res.headers.get("x-request-id") ?? "missing",
      method: "GET",
      route: "/api/health",
      status: 200,
      ms: expect.any(Number),
    });
  });

  test("says who asked, when someone is signed in", async () => {
    const { entries } = await logged(() =>
      client.api.notes.$get({}, { headers: { "x-test-user": "bob" } }),
    );
    expect(requestLine(entries)?.userId).toBe("bob");
  });

  test("never contains a share token or a board token", async () => {
    const token = "Secret-Token_123456789";
    const letter = await logged(() => app.request(`/api/shared/${token}`));
    const board = await logged(() => app.request(`/api/shared-boards/${token}`));

    expect(requestLine(letter.entries)?.route).toBe("/api/shared/:token");
    expect(requestLine(board.entries)?.route).toBe("/api/shared-boards/:token");
    expect([...letter.lines, ...board.lines].join("\n")).not.toContain(token);
  });

  test("never contains the query string", async () => {
    const { lines } = await logged(() => app.request("/api/health?code=oauth-secret"));
    expect(lines.join("\n")).not.toContain("oauth-secret");
  });

  test("a crash is an error line with the stack, under the same id", async () => {
    const created = await client.api.notes.$post({ json: { title: "Doomed", description: "x" } });
    const note = await created.json();
    await client.api.notes[":id"].$delete({ param: { id: note.id } });
    const broken = spyOn(fakePhotos, "removeAllFor").mockRejectedValueOnce(new Error("R2 is down"));

    const { res, entries } = await logged(() =>
      client.api.notes[":id"].permanent.$delete({ param: { id: note.id } }),
    );
    broken.mockRestore();

    const id = res.headers.get("x-request-id") ?? "missing";
    const crash = entries.find((entry) => entry.event === "crash");
    expect(res.status).toBe(500);
    expect(crash?.level).toBe("error");
    expect(crash?.requestId).toBe(id);
    expect(crash?.error).toMatchObject({ message: "R2 is down", stack: expect.any(String) });
    expect(requestLine(entries)).toMatchObject({ level: "error", status: 500, requestId: id });
  });
});

describe("X-Request-Id", () => {
  test("is on Better Auth's answers too", async () => {
    const { res, entries } = await logged(() => app.request("/api/auth/get-session"));
    const id = res.headers.get("x-request-id");

    expect(id).toBeTruthy();
    expect(requestLine(entries)?.requestId).toBe(id ?? "missing");
  });
});

describe("routeForLog", () => {
  test("keeps Better Auth's plain word paths", () => {
    expect(routeForLog("/api/auth/sign-in/email", "/api/auth/*")).toBe("/api/auth/sign-in/email");
    expect(routeForLog("/api/auth/get-session", "/api/auth/*")).toBe("/api/auth/get-session");
  });

  test("hides auth paths that carry anything else", () => {
    expect(routeForLog("/api/auth/reset-password/Xy7kQ2pL", "/api/auth/*")).toBe("/api/auth/*");
    expect(routeForLog("/api/auth/a/b/c", "/api/auth/*")).toBe("/api/auth/*");
  });

  test("uses the route pattern everywhere else", () => {
    expect(routeForLog("/api/notes/123", "/api/notes/:id")).toBe("/api/notes/:id");
  });
});
