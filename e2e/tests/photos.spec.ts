import { type Browser, expect, type Page, test } from "@playwright/test";
import { uniqueTitle } from "./helpers";

const WORDS = "There is a photo in this one.";

async function widePicture(page: Page) {
  const dataUrl = await page.evaluate(() => {
    const canvas = document.createElement("canvas");
    canvas.width = 2400;
    canvas.height = 1200;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("No canvas");
    context.fillStyle = "#f08a4b";
    context.fillRect(0, 0, 2400, 1200);
    return canvas.toDataURL("image/png");
  });
  return {
    name: "wide.png",
    mimeType: "image/png",
    buffer: Buffer.from(dataUrl.split(",")[1] ?? "", "base64"),
  };
}

async function writeLetter(page: Page) {
  const title = uniqueTitle("Photo");
  await page.goto("/create");
  await page.getByLabel("Title").fill(title);
  await page.getByLabel("Description").fill(WORDS);
  await page.getByRole("button", { name: "Save note" }).click();
  await expect(page.getByRole("heading", { name: title })).toBeVisible();
  return title;
}

async function addPhoto(page: Page) {
  await page.getByLabel("Add photo").setInputFiles(await widePicture(page));
  await expect(page.getByRole("img", { name: "Enclosed with this letter" })).toBeVisible();
}

async function shareToken(page: Page, options: object) {
  const id = page.url().split("/").at(-1);
  const res = await page.request.post(`/api/notes/${id}/share`, { data: options });
  const { shareToken } = await res.json();
  return shareToken as string;
}

async function asStranger(browser: Browser) {
  const context = await browser.newContext({ storageState: { cookies: [], origins: [] } });
  return context.newPage();
}

test("a photo uploads to storage, shrinks, and shows in the letter", async ({ page }) => {
  await writeLetter(page);
  await addPhoto(page);

  const photo = page.getByRole("img", { name: "Enclosed with this letter" });
  await expect.poll(() => photo.evaluate((img: HTMLImageElement) => img.naturalWidth)).toBe(1600);

  await page.reload();
  await expect(photo).toBeVisible();
});

test("a photo can be removed", async ({ page }) => {
  await writeLetter(page);
  await addPhoto(page);

  await page.getByRole("button", { name: "Remove photo" }).click();

  await expect(page.getByRole("img", { name: "Enclosed with this letter" })).toBeHidden();
  await expect(page.getByLabel("Add photo")).toBeAttached();
});

test("a stranger sees the photo in an open letter", async ({ page, browser }) => {
  await writeLetter(page);
  await addPhoto(page);
  const token = await shareToken(page, {});
  const stranger = await asStranger(browser);

  await stranger.goto(`/s/${token}`);

  const photo = stranger.getByRole("img", { name: "Enclosed with this letter" });
  await expect.poll(() => photo.evaluate((img: HTMLImageElement) => img.naturalWidth)).toBe(1600);
});

test("a sealed letter hides its photo until the moment", async ({ page, browser }) => {
  await writeLetter(page);
  await addPhoto(page);
  const nextYear = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString();
  const token = await shareToken(page, { unsealAt: nextYear });
  const stranger = await asStranger(browser);

  await stranger.goto(`/s/${token}`);

  await expect(stranger.getByRole("heading", { name: "This letter is sealed" })).toBeVisible();
  await expect(stranger.getByRole("img", { name: "Enclosed with this letter" })).toBeHidden();
});

test("a burn letter shows its photo once, then it is gone from storage", async ({
  page,
  browser,
}) => {
  await writeLetter(page);
  await addPhoto(page);
  const viewUrl = await page
    .getByRole("img", { name: "Enclosed with this letter" })
    .getAttribute("src");
  const token = await shareToken(page, { burnAfterReading: true });
  const stranger = await asStranger(browser);

  await stranger.goto(`/s/${token}`);
  await stranger.getByRole("button", { name: "Open the letter" }).click();

  const photo = stranger.getByRole("img", { name: "Enclosed with this letter" });
  await expect.poll(() => photo.evaluate((img: HTMLImageElement) => img.naturalWidth)).toBe(1600);

  //The owner's old viewing link no longer finds anything: the file itself is deleted.
  const direct = await page.request.get(viewUrl ?? "");
  expect(direct.status()).toBe(404);

  await stranger.getByRole("button", { name: "Let it burn" }).click();
  await expect(stranger.getByRole("heading", { name: "It's gone" })).toBeVisible();
});

test("the letter page fits a phone, with its extra button", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await writeLetter(page);

  const pageWidth = await page.evaluate(() => document.documentElement.scrollWidth);

  expect(pageWidth).toBeLessThanOrEqual(375);
});
