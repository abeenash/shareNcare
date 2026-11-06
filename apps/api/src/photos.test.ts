import { beforeEach, describe, expect, spyOn, test } from "bun:test";
import { MAX_PHOTO_BYTES } from "@sharencare/shared";
import { eq } from "drizzle-orm";
import { testClient } from "hono/testing";
import { fakePhotos, JPEG, stored } from "../test/fake-photos";
import { app } from "./app";
import { db } from "./db";
import { notes } from "./db/schema";

const client = testClient(app);
const asBob = { headers: { "x-test-user": "bob" } };
const inTenDays = () => new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString();

beforeEach(async () => {
  await db.delete(notes);
  stored.clear();
});

async function newNote() {
  const res = await client.api.notes.$post({
    json: { title: "For you", description: "The secret words." },
  });
  return res.json();
}

// What the browser does: ask for a slip, then send the file straight to storage.
async function upload(id: string, bytes: Uint8Array = JPEG) {
  const res = await client.api.notes[":id"].photo["upload-url"].$post({
    param: { id },
    json: { size: bytes.length },
  });
  const { key } = (await res.json()) as { key: string };
  stored.set(key, bytes);
  return key;
}

async function attachPhoto(id: string) {
  const key = await upload(id);
  await client.api.notes[":id"].photo.$put({ param: { id }, json: { key } });
  return key;
}

async function share(id: string, options: { burnAfterReading?: boolean; unsealAt?: string } = {}) {
  const res = await client.api.notes[":id"].share.$post({ param: { id }, json: options });
  const { shareToken } = await res.json();
  if (!shareToken) throw new Error("Expected a share token");
  return shareToken;
}

describe("uploading a photo", () => {
  test("the owner gets a permission slip for this note only", async () => {
    const { id } = await newNote();

    const res = await client.api.notes[":id"].photo["upload-url"].$post({
      param: { id },
      json: { size: 1000 },
    });

    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ key: expect.stringContaining(`notes/${id}/`) });
  });

  test("someone else's note gets no slip", async () => {
    const { id } = await newNote();

    const res = await client.api.notes[":id"].photo["upload-url"].$post(
      { param: { id }, json: { size: 1000 } },
      asBob,
    );

    expect(res.status).toBe(404);
  });

  test("a file that says it is too large is refused at the door", async () => {
    const { id } = await newNote();

    const res = await client.api.notes[":id"].photo["upload-url"].$post({
      param: { id },
      json: { size: MAX_PHOTO_BYTES + 1 },
    });

    expect(res.status).toBe(400);
  });
});

describe("attaching a photo", () => {
  test("a real upload is attached to the note", async () => {
    const { id } = await newNote();
    const key = await upload(id);

    const res = await client.api.notes[":id"].photo.$put({ param: { id }, json: { key } });

    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ photoKey: key });
  });

  test("a key from another note is refused", async () => {
    const mine = await newNote();
    const theirs = await newNote();
    const theirKey = await upload(theirs.id);

    const res = await client.api.notes[":id"].photo.$put({
      param: { id: mine.id },
      json: { key: theirKey },
    });

    expect(res.status).toBe(400);
    expect(stored.has(theirKey)).toBe(true);
  });

  test("a key that was never uploaded is refused", async () => {
    const { id } = await newNote();

    const res = await client.api.notes[":id"].photo.$put({
      param: { id },
      json: { key: `notes/${id}/${crypto.randomUUID()}` },
    });

    expect(res.status).toBe(400);
  });

  test("a file that is not really a JPEG is refused and thrown away", async () => {
    const { id } = await newNote();
    const key = await upload(id, new TextEncoder().encode("<script>alert(1)</script>"));

    const res = await client.api.notes[":id"].photo.$put({ param: { id }, json: { key } });

    expect(res.status).toBe(400);
    expect(stored.has(key)).toBe(false);
  });

  test("a file that turned out too large is refused and thrown away", async () => {
    const { id } = await newNote();
    const tooBig = new Uint8Array(MAX_PHOTO_BYTES + 1);
    tooBig.set(JPEG);
    const key = `notes/${id}/${crypto.randomUUID()}`;
    stored.set(key, tooBig);

    const res = await client.api.notes[":id"].photo.$put({ param: { id }, json: { key } });

    expect(res.status).toBe(400);
    expect(stored.has(key)).toBe(false);
  });

  test("a new photo replaces the old one in storage", async () => {
    const { id } = await newNote();
    const firstKey = await attachPhoto(id);
    const secondKey = await attachPhoto(id);

    expect(stored.has(firstKey)).toBe(false);
    expect(stored.has(secondKey)).toBe(true);
  });
});

describe("seeing and removing a photo", () => {
  test("the owner gets a viewing link, and a stranger gets a 404", async () => {
    const { id } = await newNote();
    const key = await attachPhoto(id);

    const mine = await client.api.notes[":id"].photo.$get({ param: { id } });
    const theirs = await client.api.notes[":id"].photo.$get({ param: { id } }, asBob);

    expect(await mine.json()).toEqual({ url: `https://storage.test/view/${key}` });
    expect(theirs.status).toBe(404);
  });

  test("removing a photo clears the note and the storage", async () => {
    const { id } = await newNote();
    const key = await attachPhoto(id);

    const res = await client.api.notes[":id"].photo.$delete({ param: { id } });

    expect(await res.json()).toMatchObject({ photoKey: null });
    expect(stored.has(key)).toBe(false);
  });

  test("deleting a note forever also deletes its photos, even unattached ones", async () => {
    const { id } = await newNote();
    await attachPhoto(id);
    await upload(id);

    await client.api.notes[":id"].$delete({ param: { id } });
    expect(stored.size).toBe(2);

    await client.api.notes[":id"].permanent.$delete({ param: { id } });
    expect(stored.size).toBe(0);
  });
});

describe("photos in shared letters", () => {
  const look = (token: string) => client.api.shared[":token"].$get({ param: { token } });
  const open = (token: string) => client.api.shared[":token"].open.$post({ param: { token } });

  test("an open letter includes a viewing link", async () => {
    const { id } = await newNote();
    const key = await attachPhoto(id);
    const token = await share(id);

    expect(await (await look(token)).json()).toMatchObject({
      photoUrl: `https://storage.test/view/${key}`,
    });
  });

  test("a sealed letter never reveals its photo", async () => {
    const { id } = await newNote();
    await attachPhoto(id);
    const token = await share(id, { unsealAt: inTenDays() });

    const body = JSON.stringify(await (await look(token)).json());

    expect(body).not.toContain("photo");
    expect(body).not.toContain("storage.test");
  });

  test("a burn letter hides its photo until it is opened", async () => {
    const { id } = await newNote();
    await attachPhoto(id);
    const token = await share(id, { burnAfterReading: true });

    expect(JSON.stringify(await (await look(token)).json())).not.toContain("photo");
  });

  test("opening a burn letter hands over the photo and erases it everywhere", async () => {
    const { id } = await newNote();
    const key = await attachPhoto(id);
    const token = await share(id, { burnAfterReading: true });

    const res = await open(token);

    expect(await res.json()).toMatchObject({
      photo: `data:image/jpeg;base64,${JPEG.toBase64()}`,
    });
    expect(stored.has(key)).toBe(false);
    const [row] = await db.select().from(notes).where(eq(notes.id, id));
    expect(row?.photoKey).toBeNull();
  });

  test("if storage fails while opening, nothing burns and the reader can try again", async () => {
    const { id } = await newNote();
    await attachPhoto(id);
    const token = await share(id, { burnAfterReading: true });
    const broken = spyOn(fakePhotos, "readAsDataUrl").mockRejectedValueOnce(
      new Error("R2 is down"),
    );

    const first = await open(token);

    expect(first.status).toBe(500);
    expect(await (await look(token)).json()).toMatchObject({ state: "ready-to-burn" });
    const [row] = await db.select().from(notes).where(eq(notes.id, id));
    expect(row?.description).toBe("The secret words.");

    const second = await open(token);
    expect(second.status).toBe(200);
    broken.mockRestore();
  });

  test("a burn letter with no photo still opens", async () => {
    const { id } = await newNote();
    const token = await share(id, { burnAfterReading: true });

    const res = await open(token);

    expect(await res.json()).toMatchObject({ photo: null });
  });

  test("a burned letter accepts no new photo", async () => {
    const { id } = await newNote();
    const token = await share(id, { burnAfterReading: true });
    await open(token);

    const res = await client.api.notes[":id"].photo["upload-url"].$post({
      param: { id },
      json: { size: 1000 },
    });

    expect(res.status).toBe(404);
  });
});
