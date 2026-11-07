import { beforeEach, describe, expect, spyOn, test } from "bun:test";
import { eq, sql } from "drizzle-orm";
import { testClient } from "hono/testing";
import { TEST_CRON_SECRET } from "../test/cron-secret";
import { fakePhotos, JPEG, stored } from "../test/fake-photos";
import { app } from "./app";
import { db } from "./db";
import { notes } from "./db/schema";

const client = testClient(app);
const asBob = { headers: { "x-test-user": "bob" } };
const asScheduler = { headers: { authorization: `Bearer ${TEST_CRON_SECRET}` } };
const sweep = client.api.internal["sweep-trash"];

beforeEach(async () => {
  await db.delete(notes);
  stored.clear();
});

async function newNote(title: string, options?: typeof asBob) {
  const res = await client.api.notes.$post({ json: { title, description: "x" } }, options);
  return res.json();
}

async function trash(id: string, options?: typeof asBob) {
  await client.api.notes[":id"].$delete({ param: { id } }, options);
}

function putPhoto(id: string) {
  const key = `notes/${id}/${crypto.randomUUID()}`;
  stored.set(key, JPEG);
  return key;
}

async function trashedDaysAgo(id: string, days: number) {
  await db
    .update(notes)
    .set({ deletedAt: sql`now() - make_interval(days => ${days})` })
    .where(eq(notes.id, id));
}

const titles = async () =>
  (await db.select({ title: notes.title }).from(notes)).map((n) => n.title);

describe("empty trash", () => {
  test("is not mistaken for a note id", async () => {
    const res = await client.api.notes.trash.$delete();

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ destroyed: 0, failed: 0 });
  });

  test("deletes only what is in my trash, with its photos", async () => {
    const onDesk = await newNote("On my desk");
    const mine = await newNote("In my trash");
    const bobs = await newNote("In Bob's trash", asBob);
    const deskPhoto = putPhoto(onDesk.id);
    const myPhoto = putPhoto(mine.id);
    const bobsPhoto = putPhoto(bobs.id);
    await trash(mine.id);
    await trash(bobs.id, asBob);

    const res = await client.api.notes.trash.$delete();

    expect(await res.json()).toEqual({ destroyed: 1, failed: 0 });
    expect((await titles()).toSorted()).toEqual(["In Bob's trash", "On my desk"]);
    expect(stored.has(myPhoto)).toBe(false);
    expect(stored.has(deskPhoto)).toBe(true);
    expect(stored.has(bobsPhoto)).toBe(true);
  });

  test("a storage failure keeps that letter in the trash and carries on", async () => {
    const stuck = await newNote("Stuck");
    const fine = await newNote("Fine");
    await trash(stuck.id);
    await trash(fine.id);
    const broken = spyOn(fakePhotos, "removeAllFor").mockImplementation(async (id) => {
      if (id === stuck.id) throw new Error("R2 is down");
    });

    const res = await client.api.notes.trash.$delete();
    broken.mockRestore();

    expect(await res.json()).toEqual({ destroyed: 1, failed: 1 });
    expect(await titles()).toEqual(["Stuck"]);

    const retry = await client.api.notes.trash.$delete();
    expect(await retry.json()).toEqual({ destroyed: 1, failed: 0 });
    expect(await titles()).toEqual([]);
  });
});

describe("permanent delete", () => {
  test("a storage failure keeps the letter, so nothing is left orphaned", async () => {
    const note = await newNote("Careful");
    const photo = putPhoto(note.id);
    await trash(note.id);
    const broken = spyOn(fakePhotos, "removeAllFor").mockRejectedValueOnce(new Error("R2 is down"));

    const res = await client.api.notes[":id"].permanent.$delete({ param: { id: note.id } });
    broken.mockRestore();

    expect(res.status).toBe(500);
    expect(await titles()).toEqual(["Careful"]);
    expect(stored.has(photo)).toBe(true);
  });
});

describe("the daily sweep", () => {
  test("refuses a missing or wrong secret, and deletes nothing", async () => {
    const note = await newNote("Old");
    await trash(note.id);
    await trashedDaysAgo(note.id, 40);

    const url = "/api/internal/sweep-trash";
    const missing = await app.request(url, { method: "POST" });
    const wrong = await app.request(url, {
      method: "POST",
      headers: { authorization: "Bearer nope" },
    });

    expect(missing.status).toBe(401);
    expect(wrong.status).toBe(401);
    expect(await titles()).toEqual(["Old"]);
  });

  test("the 30-day line: 29 days stays, 31 days goes", async () => {
    const stays = await newNote("29 days");
    const goes = await newNote("31 days");
    const staysPhoto = putPhoto(stays.id);
    const goesPhoto = putPhoto(goes.id);
    await trash(stays.id);
    await trash(goes.id);
    await trashedDaysAgo(stays.id, 29);
    await trashedDaysAgo(goes.id, 31);

    const res = await sweep.$post(undefined, asScheduler);

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ destroyed: 1, failed: 0 });
    expect(await titles()).toEqual(["29 days"]);
    expect(stored.has(staysPhoto)).toBe(true);
    expect(stored.has(goesPhoto)).toBe(false);
  });

  test("never touches a letter on the desk, however old", async () => {
    const note = await newNote("Written years ago");
    await db
      .update(notes)
      .set({ createdAt: sql`now() - interval '5 years'` })
      .where(eq(notes.id, note.id));

    await sweep.$post(undefined, asScheduler);

    expect(await titles()).toEqual(["Written years ago"]);
  });

  test("sweeps every user's trash", async () => {
    const mine = await newNote("Mine");
    const bobs = await newNote("Bob's", asBob);
    await trash(mine.id);
    await trash(bobs.id, asBob);
    await trashedDaysAgo(mine.id, 31);
    await trashedDaysAgo(bobs.id, 31);

    const res = await sweep.$post(undefined, asScheduler);

    expect(await res.json()).toEqual({ destroyed: 2, failed: 0 });
  });

  test("running twice is safe: the second run finds nothing", async () => {
    const note = await newNote("Old");
    await trash(note.id);
    await trashedDaysAgo(note.id, 31);

    await sweep.$post(undefined, asScheduler);
    const second = await sweep.$post(undefined, asScheduler);

    expect(second.status).toBe(200);
    expect(await second.json()).toEqual({ destroyed: 0, failed: 0 });
  });

  test("a failure reports 500, and the next run finishes the job", async () => {
    const note = await newNote("Old");
    const photo = putPhoto(note.id);
    await trash(note.id);
    await trashedDaysAgo(note.id, 31);
    const broken = spyOn(fakePhotos, "removeAllFor").mockRejectedValueOnce(new Error("R2 is down"));

    const first = await sweep.$post(undefined, asScheduler);
    broken.mockRestore();

    expect(first.status).toBe(500);
    expect(await first.json()).toEqual({ destroyed: 0, failed: 1 });
    expect(await titles()).toEqual(["Old"]);

    const second = await sweep.$post(undefined, asScheduler);
    expect(second.status).toBe(200);
    expect(await titles()).toEqual([]);
    expect(stored.has(photo)).toBe(false);
  });

  test("a letter restored before the sweep is safe, however long it sat there", async () => {
    const note = await newNote("Saved in time");
    await trash(note.id);
    await trashedDaysAgo(note.id, 31);
    await client.api.notes[":id"].restore.$post({ param: { id: note.id } });

    const res = await sweep.$post(undefined, asScheduler);

    expect(await res.json()).toEqual({ destroyed: 0, failed: 0 });
    expect(await titles()).toEqual(["Saved in time"]);
  });

  test("takes at most 100 in one run, oldest first", async () => {
    const rows = Array.from({ length: 105 }, (_, i) => ({
      title: `Letter ${i}`,
      description: "x",
      userId: "alice",
      deletedAt: new Date(Date.now() - (40 + i) * 86_400_000),
    }));
    await db.insert(notes).values(rows);

    const res = await sweep.$post(undefined, asScheduler);

    expect(await res.json()).toEqual({ destroyed: 100, failed: 0 });
    expect((await titles()).toSorted()).toEqual([
      "Letter 0",
      "Letter 1",
      "Letter 2",
      "Letter 3",
      "Letter 4",
    ]);
  });
});
