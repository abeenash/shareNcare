import { type Browser, expect, type Page, test } from "@playwright/test";
import { uniqueTitle } from "./helpers";

const WORDS = "Didi, the secret recipe is cardamom.";
// A key that is the right shape, but not the key to any of these letters.
const WRONG_KEY = "q2Zt8vN4kX0bW7yLmP3sR9cT1uE6aH5jD-_fG2iK0oQ";

// Another browser signed in to the same account: same desk, but none of this
// browser's keys. Like opening shareNcare on your phone.
async function sameAccountElsewhere(browser: Browser) {
  const context = await browser.newContext({ storageState: "playwright/.auth/user.json" });
  return context.newPage();
}

async function asStranger(browser: Browser) {
  const context = await browser.newContext({ storageState: { cookies: [], origins: [] } });
  return context.newPage();
}

// Writes a locked letter through the real page, and returns what left the browser.
async function writeLocked(page: Page, title: string, words = WORDS) {
  await page.goto("/create");
  await page.getByLabel("To", { exact: true }).fill("Didi");
  await page.getByLabel("Title").fill(title);
  await page.getByLabel("Description").fill(words);
  await page.getByLabel("Lock with a key").check();

  const saving = page.waitForRequest(
    (req) => req.method() === "POST" && new URL(req.url()).pathname === "/api/notes",
  );
  await page.getByRole("button", { name: "Save note" }).click();
  const sent = (await saving).postDataJSON();
  await expect(page.getByRole("heading", { name: title })).toBeVisible();
  return { sent, id: page.url().split("/note/")[1] ?? "" };
}

async function shareLink(page: Page, options: { burn?: boolean } = {}) {
  await page.getByRole("button", { name: "Share", exact: true }).click();
  if (options.burn) await page.getByLabel("Burn after reading").check();
  await page.getByRole("dialog").getByRole("button", { name: "Create link" }).click();
  const link = await page.getByRole("textbox", { name: "Share link" }).inputValue();
  await page.getByRole("dialog").getByRole("button", { name: "Done" }).click();
  return link;
}

test("a locked letter leaves the browser locked, and reads normally on this desk", async ({
  page,
}) => {
  const title = uniqueTitle("Recipe");
  const { sent, id } = await writeLocked(page, title);

  // What actually travelled to the server: a box, and no words.
  expect(sent.locked).toBe(true);
  expect(sent.description).toMatch(/^v1\.[\w-]{16}\.[\w-]+$/);
  expect(JSON.stringify(sent)).not.toContain("cardamom");

  // What the server keeps and hands back: the same box.
  const stored = await (await page.request.get(`/api/notes/${id}`)).json();
  expect(stored.description).toBe(sent.description);

  // This browser has the key, so the letter reads normally here.
  await expect(page.getByText(WORDS)).toBeVisible();
  await expect(page.getByRole("button", { name: "Add photo" })).toBeHidden();

  // The desk never shows locked words, even here.
  await page.goto("/");
  const card = page.getByRole("article").filter({ hasText: title });
  await expect(card.getByText("Locked with a key. Open it to read.")).toBeVisible();
  await expect(card.getByText("cardamom")).toBeHidden();
});

test("on another device the letter stays locked, until its key link is opened there", async ({
  page,
  browser,
  context,
}) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  const title = uniqueTitle("Recipe");
  const { id } = await writeLocked(page, title);
  await page.getByRole("button", { name: "Key link" }).click();
  const keyLink = await page.evaluate(() => navigator.clipboard.readText());
  expect(keyLink).toContain(`/note/${id}#`);

  const phone = await sameAccountElsewhere(browser);
  await phone.goto(`/note/${id}`);
  await expect(phone.getByRole("article").getByText("doesn't have its key")).toBeVisible();
  await expect(phone.getByText(WORDS)).toBeHidden();

  // Without the key, there is no editing and no link worth sharing.
  await phone.goto(`/note/${id}/edit`);
  await expect(phone).toHaveURL(new RegExp(`/note/${id}$`));
  await phone.getByRole("button", { name: "Share", exact: true }).click();
  await expect(phone.getByRole("dialog").getByText("doesn't have its key")).toBeVisible();

  // A key link with the wrong key opens nothing, and keeps nothing.
  await phone.goto(`/note/${id}#${WRONG_KEY}`);
  await expect(phone.getByText("That key link doesn't open this letter.")).toBeVisible();
  await phone.goto(`/note/${id}`);
  await expect(phone.getByRole("article").getByText("doesn't have its key")).toBeVisible();

  // On the owner's browser too: a wrong key link must not replace the real key.
  await page.goto(`/note/${id}#${WRONG_KEY}`);
  await expect(page.getByText("That key link doesn't open this letter.")).toBeVisible();
  await page.goto(`/note/${id}`);
  await expect(page.getByText(WORDS)).toBeVisible();

  // The real key link opens it, is kept, and leaves the address bar.
  await phone.goto(keyLink);
  await expect(phone.getByText(WORDS)).toBeVisible();
  await expect(phone).toHaveURL(new RegExp(`/note/${id}$`));
  await phone.reload();
  await expect(phone.getByText(WORDS)).toBeVisible();
});

test("a stranger with the whole link reads it; a link without its key opens nothing", async ({
  page,
  browser,
}) => {
  await writeLocked(page, uniqueTitle("Recipe"));
  const link = await shareLink(page);
  expect(link).toMatch(/\/s\/[\w-]{22}#[\w-]{43}$/);
  const [withoutKey] = link.split("#");

  const stranger = await asStranger(browser);
  await stranger.goto(link);
  await expect(stranger.getByText(WORDS)).toBeVisible();
  await expect(stranger.getByText("From · Robot")).toBeVisible();

  await stranger.goto(withoutKey ?? "");
  await expect(stranger.getByRole("heading", { name: "This letter is locked" })).toBeVisible();
  await expect(stranger.getByText(WORDS)).toBeHidden();

  await stranger.goto(`${withoutKey}#${WRONG_KEY}`);
  await expect(stranger.getByRole("heading", { name: "This key doesn't fit" })).toBeVisible();
});

test("a locked burn letter can only be opened by someone holding the key", async ({
  page,
  browser,
}) => {
  const title = uniqueTitle("Recipe");
  await writeLocked(page, title);
  const link = await shareLink(page, { burn: true });
  const [withoutKey] = link.split("#");

  // Without the key, nobody is even offered the button: burning would waste it.
  const stranger = await asStranger(browser);
  await stranger.goto(withoutKey ?? "");
  await expect(stranger.getByRole("heading", { name: "This letter is locked" })).toBeVisible();
  await expect(stranger.getByRole("button", { name: "Open the letter" })).toBeHidden();

  const didi = await asStranger(browser);
  await didi.goto(link);
  await didi.getByRole("button", { name: "Open the letter" }).click();
  await expect(didi.getByText(WORDS)).toBeVisible();
  await didi.getByRole("button", { name: "Let it burn" }).click();
  await expect(didi.getByRole("heading", { name: "It's gone" })).toBeVisible();

  await page.reload();
  await expect(page.getByText("Its words are gone, even from here.")).toBeVisible();
});

test("editing a locked letter locks the new words again", async ({ page }) => {
  const title = uniqueTitle("Recipe");
  const { id } = await writeLocked(page, title);

  await page.getByRole("link", { name: "Edit" }).click();
  await expect(page.getByLabel("Description")).toHaveValue(WORDS);
  await expect(page.getByText("Locked with a key. Your changes are locked again")).toBeVisible();
  await page.getByLabel("Description").fill("Actually, it is cinnamon.");

  const saving = page.waitForRequest(
    (req) => req.method() === "PUT" && new URL(req.url()).pathname === `/api/notes/${id}`,
  );
  await page.getByRole("button", { name: "Save changes" }).click();
  const sent = (await saving).postDataJSON();

  expect(sent.locked).toBe(true);
  expect(JSON.stringify(sent)).not.toContain("cinnamon");
  await expect(page.getByText("Actually, it is cinnamon.")).toBeVisible();
});
