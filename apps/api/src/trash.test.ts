import { beforeEach, describe, expect, test } from "bun:test";
import { testClient } from "hono/testing";
import { app } from "./app";
import { db } from "./db";
import { notes } from "./db/schema";

const client = testClient(app);

const createNote = async (title: string) => {
  const res = await client.api.notes.$post({ json: { title, description: "x" } });
  return res.json();
};

beforeEach(async () => {
  await db.delete(notes);
});

describe("trash", () => {
  test("delete moves a note to the trash instead of erasing it", async () => {
    const note = await createNote("Keep me");
    await client.api.notes[":id"].$delete({ param: { id: note.id } });

    const active = await (await client.api.notes.$get()).json();
    const trash = await (await client.api.notes.trash.$get()).json();
    expect(active).toHaveLength(0);
    expect(trash.map((n) => n.title)).toEqual(["Keep me"]);
    expect(trash[0]?.deletedAt).not.toBeNull();
  });

  test("restore brings a note back", async () => {
    const note = await createNote("Come back");
    await client.api.notes[":id"].$delete({ param: { id: note.id } });

    const restored = await client.api.notes[":id"].restore.$post({ param: { id: note.id } });
    expect(restored.status).toBe(200);

    const active = await (await client.api.notes.$get()).json();
    expect(active.map((n) => n.title)).toEqual(["Come back"]);
  });

  test("permanent delete only works on notes already in the trash", async () => {
    const note = await createNote("Careful");

    const tooEarly = await client.api.notes[":id"].permanent.$delete({ param: { id: note.id } });
    expect(tooEarly.status).toBe(404);

    await client.api.notes[":id"].$delete({ param: { id: note.id } });
    const gone = await client.api.notes[":id"].permanent.$delete({ param: { id: note.id } });
    expect(gone.status).toBe(200);

    const trash = await (await client.api.notes.trash.$get()).json();
    expect(trash).toHaveLength(0);
  });
});

describe("pin", () => {
  test("pinned notes come first", async () => {
    const older = await createNote("Older, pinned");
    await createNote("Newer, not pinned");

    await client.api.notes[":id"].pin.$patch({ param: { id: older.id }, json: { pinned: true } });

    const active = await (await client.api.notes.$get()).json();
    expect(active.map((n) => n.title)).toEqual(["Older, pinned", "Newer, not pinned"]);
  });
});
