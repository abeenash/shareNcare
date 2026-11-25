import { describe, expect, spyOn, test } from "bun:test";
import { captureLogs } from "../test/capture-logs";
import { app } from "./app";
import { db } from "./db";

describe("GET /api/health/db", () => {
  test("says the database is up, and how long it took", async () => {
    const res = await app.request("/api/health/db");
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true, db: "up", ms: expect.any(Number) });
  });

  test("answers 503 when the database fails, and keeps the reason in the logs", async () => {
    const broken = spyOn(db, "execute").mockRejectedValueOnce(
      new Error("password authentication failed for user neondb_owner"),
    );
    const logs = captureLogs();
    let res: Response;
    try {
      res = await app.request("/api/health/db");
    } finally {
      logs.stop();
      broken.mockRestore();
    }

    expect(res.status).toBe(503);
    expect(await res.json()).toEqual({ ok: false, db: "down" });

    const down = logs.entries().find((entry) => entry.event === "health.db_down");
    expect(down?.level).toBe("warn");
    expect(JSON.stringify(down)).toContain("password authentication failed");
  });

  test("the plain health check never touches the database", async () => {
    const watched = spyOn(db, "execute");
    try {
      const res = await app.request("/api/health");
      expect(res.status).toBe(200);
      expect(watched).not.toHaveBeenCalled();
    } finally {
      watched.mockRestore();
    }
  });
});
