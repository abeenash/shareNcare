import { expect, type Page, test } from "@playwright/test";
import postgres from "postgres";
import { cronSecret, databaseUrl } from "./e2e-env";
import { newRobot, signUp, uniqueTitle } from "./helpers";

// Emptying the trash touches every trashed letter this user has, so each test
// signs up its own robot. Sharing one would wipe letters other tests are using.
test.use({ storageState: { cookies: [], origins: [] } });

const SWEEP = "/api/internal/sweep-trash";
const asScheduler = { headers: { Authorization: `Bearer ${cronSecret}` } };

const cardFor = (page: Page, title: string) => page.getByRole("article").filter({ hasText: title });

async function createNote(page: Page, title: string) {
  const res = await page.request.post("/api/notes", {
    data: { title, description: "Written by a robot" },
  });
  expect(res.status()).toBe(201);
  const { id } = await res.json();
  return id as string;
}

async function trashNote(page: Page, id: string) {
  const res = await page.request.delete(`/api/notes/${id}`);
  expect(res.status()).toBe(200);
}

// Time travel: pretend this letter went into the trash 31 days ago.
async function moveTrashDateBack(id: string) {
  const sql = postgres(databaseUrl, { max: 1 });
  await sql`update notes set deleted_at = now() - interval '31 days' where id = ${id}`;
  await sql.end();
}

test("emptying the trash deletes trashed letters and leaves the desk alone", async ({ page }) => {
  await signUp(page, newRobot());
  const onDesk = uniqueTitle("Keep me");
  const first = uniqueTitle("Bin one");
  const second = uniqueTitle("Bin two");
  await createNote(page, onDesk);
  await trashNote(page, await createNote(page, first));
  await trashNote(page, await createNote(page, second));

  await page.goto("/trash");
  await expect(cardFor(page, first)).toContainText("30 DAYS LEFT");
  await page.getByRole("button", { name: "Empty trash" }).click();
  await expect(page.getByRole("dialog")).toContainText("2 letters");
  await page.getByRole("dialog").getByRole("button", { name: "Empty trash" }).click();

  await expect(page.getByText("The trash is empty")).toBeVisible();
  await expect(page.getByRole("button", { name: "Empty trash" })).toBeHidden();

  await page.goto("/");
  await expect(cardFor(page, onDesk)).toBeVisible();
});

test("the sweep refuses anyone without the secret", async ({ request }) => {
  expect((await request.post(SWEEP)).status()).toBe(401);
  const wrong = { headers: { Authorization: "Bearer not-the-secret" } };
  expect((await request.post(SWEEP, wrong)).status()).toBe(401);
});

test("the sweep deletes a letter past 30 days, and its photo from real storage", async ({
  page,
  request,
}) => {
  await signUp(page, newRobot());
  const fresh = uniqueTitle("Trashed today");
  const old = uniqueTitle("Trashed long ago");
  await trashNote(page, await createNote(page, fresh));
  const oldId = await createNote(page, old);

  const jpeg = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 1, 2, 3]);
  const slip = await page.request.post(`/api/notes/${oldId}/photo/upload-url`, {
    data: { size: jpeg.length },
  });
  const { key, uploadUrl } = await slip.json();
  expect((await request.put(uploadUrl, { data: jpeg })).ok()).toBe(true);
  const attached = await page.request.put(`/api/notes/${oldId}/photo`, { data: { key } });
  expect(attached.status()).toBe(200);
  const photo = await page.request.get(`/api/notes/${oldId}/photo`);
  const { url: photoUrl } = await photo.json();
  expect((await request.get(photoUrl)).status()).toBe(200);

  await trashNote(page, oldId);
  await moveTrashDateBack(oldId);

  const sweep = await request.post(SWEEP, asScheduler);
  expect(sweep.status()).toBe(200);
  expect((await sweep.json()).failed).toBe(0);

  await page.goto("/trash");
  await expect(cardFor(page, fresh)).toBeVisible();
  await expect(cardFor(page, old)).toBeHidden();
  expect((await request.get(photoUrl)).status()).toBe(404);
});
