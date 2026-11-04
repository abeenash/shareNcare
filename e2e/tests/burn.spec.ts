import { type Browser, expect, type Page, test } from "@playwright/test";
import { uniqueTitle } from "./helpers";

const WORDS = "Only one person will ever read this.";

async function shareLetter(page: Page, options: { burnAfterReading?: boolean; unsealAt?: string }) {
  const title = uniqueTitle("Secret");
  const created = await page.request.post("/api/notes", {
    data: { title, description: WORDS, recipient: "Didi" },
  });
  const { id } = await created.json();
  const shared = await page.request.post(`/api/notes/${id}/share`, { data: options });
  const { shareToken } = await shared.json();
  return { id, title, token: shareToken as string };
}

async function asStranger(browser: Browser) {
  const context = await browser.newContext({ storageState: { cookies: [], origins: [] } });
  return context.newPage();
}

test("a burn letter opens once, burns, and stays burned", async ({ page, browser }) => {
  const { title, token } = await shareLetter(page, { burnAfterReading: true });
  const stranger = await asStranger(browser);

  await page.request.get(`/s/${token}`);
  await page.request.get(`/api/shared/${token}`);

  await stranger.goto(`/s/${token}`);
  await expect(stranger.getByRole("heading", { name: "burns after reading" })).toBeVisible();
  await expect(stranger.getByText(WORDS)).toBeHidden();

  await stranger.getByRole("button", { name: "Open the letter" }).click();
  await expect(stranger.getByRole("heading", { name: title })).toBeVisible();
  await expect(stranger.getByText(WORDS)).toBeVisible();

  await stranger.getByRole("button", { name: "Let it burn" }).click();
  await expect(stranger.getByRole("heading", { name: "It's gone" })).toBeVisible();

  await stranger.reload();
  await expect(stranger.getByRole("heading", { name: "already burned" })).toBeVisible();
  await expect(stranger.getByText(WORDS)).toBeHidden();

  await page.goto("/");
  const card = page.getByRole("article").filter({ hasText: title });
  await expect(card.getByText("The words are gone.")).toBeVisible();
  await expect(card.getByRole("link", { name: "Edit note" })).toBeHidden();
});

test("the burn also works for people who ask for less motion", async ({ browser, page }) => {
  const { token } = await shareLetter(page, { burnAfterReading: true });
  const context = await browser.newContext({
    storageState: { cookies: [], origins: [] },
    reducedMotion: "reduce",
  });
  const stranger = await context.newPage();

  await stranger.goto(`/s/${token}`);
  await stranger.getByRole("button", { name: "Open the letter" }).click();
  await stranger.getByRole("button", { name: "Let it burn" }).click();

  await expect(stranger.getByRole("heading", { name: "It's gone" })).toBeVisible({ timeout: 1500 });
});

test("when ten people open at once, exactly one gets the letter", async ({ page, request }) => {
  const { token } = await shareLetter(page, { burnAfterReading: true });

  const responses = await Promise.all(
    Array.from({ length: 10 }, () => request.post(`/api/shared/${token}/open`)),
  );

  expect(responses.filter((res) => res.status() === 200)).toHaveLength(1);
  expect(responses.filter((res) => res.status() === 404)).toHaveLength(9);
});

test("a sealed letter shows the envelope and never sends the words", async ({ page, browser }) => {
  const nextYear = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString();
  const { title, token } = await shareLetter(page, { unsealAt: nextYear });
  const stranger = await asStranger(browser);

  await stranger.goto(`/s/${token}`);
  await expect(stranger.getByRole("heading", { name: "This letter is sealed" })).toBeVisible();

  const raw = await (await page.request.get(`/api/shared/${token}`)).text();
  expect(raw).not.toContain(WORDS);
  expect(raw).not.toContain(title);
});

test("the writer chooses burn and seal in the share dialog", async ({ page }) => {
  const title = uniqueTitle("Birthday");
  await page.goto("/create");
  await page.getByLabel("Title").fill(title);
  await page.getByLabel("Description").fill(WORDS);
  await page.getByRole("button", { name: "Save note" }).click();

  await page.getByRole("button", { name: "Share", exact: true }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Burn after reading").check();
  await dialog.getByLabel("Seal until").fill("2099-12-25");
  await dialog.getByRole("button", { name: "Create link" }).click();

  await expect(dialog.getByText("Burns after one reading")).toBeVisible();
  await expect(dialog.getByText("Sealed until 25 DEC 2099")).toBeVisible();
});
