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

describe("ownership", () => {
  test("each user only sees their own notes", async () => {
    await client.api.notes.$post({ json: { title: "Alice's secret", description: "x" } });

    const alicesList = await (await client.api.notes.$get()).json();
    const bobsList = await (await client.api.notes.$get(undefined, asBob)).json();

    expect(alicesList.map((n) => n.title)).toEqual(["Alice's secret"]);
    expect(bobsList).toHaveLength(0);
  });

  test("a user cannot read, edit or trash someone else's note", async () => {
    const created = await client.api.notes.$post({ json: { title: "Mine", description: "x" } });

    const note = await created.json();
    const param = { id: note.id };

    const read = await client.api.notes[":id"].$get({ param }, asBob);
    const edit = await client.api.notes[":id"].$put(
      { param, json: { title: "Hacked", description: "x" } },
      asBob,
    );

    const trash = await client.api.notes[":id"].$delete({ param }, asBob);

    expect([read.status, edit.status, trash.status]).toEqual([404, 404, 404]);

    const stillMine = await (await client.api.notes[":id"].$get({ param })).json();
    expect(stillMine.title).toBe("Mine");
  });
});
