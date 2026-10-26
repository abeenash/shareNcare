import { describe, expect, test } from "bun:test";
import type { ApiErrorBody } from "@sharencare/shared";
import { testClient } from "hono/testing";
import { app } from "./app";

const client = testClient(app);

describe("notes API", () => {
  test("creates a note, trims it, and reads it back", async () => {
    const created = await client.api.notes.$post({
      json: { title: "  Hello  ", description: "World" },
    });
    expect(created.status).toBe(201);
    const note = await created.json();
    expect(note.title).toBe("Hello");

    const fetched = await client.api.notes[":id"].$get({ param: { id: note.id } });
    expect(fetched.status).toBe(200);

    const list = await client.api.notes.$get();
    expect(await list.json()).toHaveLength(1);
  });

  test("rejects a blank title", async () => {
    const res = await app.request("/api/notes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "  ", description: "x" }),
    });
    expect(res.status).toBe(400);
    const body = (await res.json()) as ApiErrorBody;
    expect(body.error.code).toBe("VALIDATION");
    expect(body.error.issues).toEqual([{ path: "title", message: "Title is required" }]);
  });

  test("rejects a malformed id", async () => {
    const res = await app.request("/api/notes/not-a-uuid");
    expect(res.status).toBe(400);
  });

  test("updates, deletes, then returns 404", async () => {
    const created = await client.api.notes.$post({ json: { title: "A", description: "B" } });
    const note = await created.json();

    const updated = await client.api.notes[":id"].$put({
      param: { id: note.id },
      json: { title: "A2", description: "B2" },
    });
    expect((await updated.json()).title).toBe("A2");

    const deleted = await client.api.notes[":id"].$delete({ param: { id: note.id } });
    expect(deleted.status).toBe(200);

    const again = await client.api.notes[":id"].$get({ param: { id: note.id } });
    expect(again.status).toBe(404);
  });
});
