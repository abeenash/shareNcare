import { type Browser, expect, type Locator, type Page, test } from "@playwright/test";
import { newRobot, signUp, uniqueTitle } from "./helpers";

// What the practice model always answers (FAKE_SUGGESTION in apps/api/src/lib/ai.ts).
const FAKE_SUGGESTION =
  "This is a practice suggestion from the fake model. A real AI would rewrite your letter here.";
const DRAFT = "Didi, thank you for the cardamom tea. You are the best.";
const clockIn = (ms: number) =>
  new Date(ms).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });

// Everyone gets 3 suggestions a day, so a test that really asks uses a brand-new person.
async function newPerson(
  browser: Browser,
  options: { timezoneId?: string; viewport?: { width: number; height: number } } = {},
) {
  const context = await browser.newContext({
    storageState: { cookies: [], origins: [] },
    locale: "en-US",
    ...options,
  });
  const page = await context.newPage();
  await signUp(page, newRobot());
  return page;
}

const panel = (page: Page) => page.getByRole("region", { name: "Help me write" });
const askButton = (page: Page) => panel(page).getByRole("button", { name: "Help me write" });
const isAsking = (req: { method(): string; url(): string }) =>
  req.method() === "POST" && new URL(req.url()).pathname === "/api/ai/help-me-write";
const boxOf = async (part: Locator) => {
  const box = await part.boundingBox();
  if (!box) throw new Error("not on the screen");
  return box;
};
const isCounting = (req: { method(): string; url(): string }) =>
  req.method() === "GET" && new URL(req.url()).pathname === "/api/ai/quota";

test("Koinonia suggests, and the letter only changes when you choose", async ({ browser }) => {
  const page = await newPerson(browser);
  const title = uniqueTitle("Tea");
  await page.goto("/create");
  await page.getByLabel("Title").fill(title);
  await page.getByLabel("Description").fill(DRAFT);

  const asking = page.waitForRequest(isAsking);
  await askButton(page).click();
  // A new letter has no id yet, so only the words travel.
  expect((await asking).postDataJSON()).toEqual({ text: DRAFT });

  await expect(panel(page).getByText(FAKE_SUGGESTION)).toBeVisible();
  await expect(panel(page).getByText("2 left today")).toBeVisible();
  await expect(page.getByLabel("Description")).toHaveValue(DRAFT);

  await panel(page).getByRole("button", { name: "Keep mine" }).click();
  await expect(panel(page).getByText(FAKE_SUGGESTION)).toBeHidden();
  await expect(page.getByLabel("Description")).toHaveValue(DRAFT);

  await askButton(page).click();
  await panel(page).getByRole("button", { name: "Use this" }).click();
  await expect(page.getByLabel("Description")).toHaveValue(FAKE_SUGGESTION);
  await expect(panel(page).getByText("1 left today")).toBeVisible();

  await page.getByRole("button", { name: "Save note" }).click();
  await expect(page.getByRole("heading", { name: title })).toBeVisible();
  await expect(page.getByText(FAKE_SUGGESTION)).toBeVisible();
});

test("editing a saved letter tells the server which letter it is", async ({ browser }) => {
  const page = await newPerson(browser);
  const saved = await page.request.post("/api/notes", {
    data: { title: uniqueTitle("Saved"), description: DRAFT },
  });
  const { id } = await saved.json();

  await page.goto(`/note/${id}/edit`);
  await expect(page.getByLabel("Description")).toHaveValue(DRAFT);
  const asking = page.waitForRequest(isAsking);
  await askButton(page).click();

  // The id lets the server check, on its own, that this letter isn't locked.
  expect((await asking).postDataJSON()).toEqual({ text: DRAFT, noteId: id });
  await expect(panel(page).getByText(FAKE_SUGGESTION)).toBeVisible();
});

test("three a day, then the button rests and says when, on your clock", async ({ browser }) => {
  const page = await newPerson(browser, { timezoneId: "Asia/Kathmandu" });
  await page.goto("/create");
  await page.getByLabel("Description").fill(DRAFT);

  for (const left of [2, 1]) {
    await askButton(page).click();
    await expect(panel(page).getByText(`${left} left today`)).toBeVisible();
    await panel(page).getByRole("button", { name: "Keep mine" }).click();
  }
  await askButton(page).click();

  // Midnight UTC, from the server's count, shown in Nepal time.
  const none = panel(page).getByText("0 left today · more at 5:45 AM");
  await expect(none).toBeVisible();
  await expect(askButton(page)).toBeDisabled();
  await expect(page.getByLabel("Description")).toHaveValue(DRAFT);

  await page.reload();
  await expect(none).toBeVisible();
  await expect(askButton(page)).toBeDisabled();
});

test("the count stays true after locking, unlocking and reloading", async ({ browser }) => {
  const page = await newPerson(browser);
  await page.goto("/create");
  await page.getByLabel("Description").fill(DRAFT);
  await expect(panel(page).getByText("3 left today")).toBeVisible();

  await askButton(page).click();
  await expect(panel(page).getByText("2 left today")).toBeVisible();

  const lock = page.getByLabel("Lock with a key");
  await lock.check();
  await expect(panel(page)).toHaveCount(0);
  await lock.uncheck();
  await expect(panel(page).getByText("2 left today")).toBeVisible();

  await page.reload();
  await expect(panel(page).getByText("2 left today")).toBeVisible();
});

test("if the server says no anyway, it still says when", async ({ page }) => {
  const midnightUtc = new Date().setUTCHours(24, 0, 0, 0);
  await page.route("**/api/ai/help-me-write", (route) =>
    route.fulfill({
      status: 429,
      headers: { "Retry-After": String(Math.ceil((midnightUtc - Date.now()) / 1000)) },
      json: { error: { message: "Koinonia has helped with all the letters it can for today." } },
    }),
  );
  await page.goto("/create");
  await page.getByLabel("Description").fill(DRAFT);
  await askButton(page).click();

  const alert = panel(page).getByRole("alert");
  await expect(alert).toContainText("all the letters it can for today.");
  await expect(alert).toContainText(`That's ${clockIn(midnightUtc)} for you.`);
  await expect(askButton(page)).toBeDisabled();
});

for (const screen of [
  { name: "a phone", viewport: { width: 375, height: 812 } },
  { name: "a laptop", viewport: { width: 1280, height: 800 } },
]) {
  test(`on ${screen.name}, the suggestion reads like the letter, with the buttons below`, async ({
    browser,
  }) => {
    const page = await newPerson(browser, { viewport: screen.viewport });
    await page.goto("/create");
    const letter = page.getByLabel("Description");
    await letter.fill(DRAFT);
    await askButton(page).click();

    const words = panel(page).getByText(FAKE_SUGGESTION);
    await expect(words).toBeVisible();
    const intro = await boxOf(panel(page).getByText("Koinonia can help make your words"));
    const box = await boxOf(words);
    const label = await boxOf(panel(page).getByText("Koinonia suggests"));
    const card = await boxOf(panel(page));
    const keep = await boxOf(panel(page).getByRole("button", { name: "Keep mine" }));
    const use = await boxOf(panel(page).getByRole("button", { name: "Use this" }));

    // The button never squeezes the intro into a word per line.
    expect(intro.width).toBeGreaterThan(card.width * 0.6);
    // One column: the words start under their label and fill the box, the buttons come after.
    expect(box.x).toBeCloseTo(label.x, 0);
    expect(box.y).toBeGreaterThanOrEqual(label.y + label.height);
    expect(box.width).toBeGreaterThan(card.width * 0.75);
    expect(keep.y).toBeGreaterThanOrEqual(box.y + box.height);
    expect(use.y).toBeGreaterThanOrEqual(box.y + box.height);
    // Same letters as your own draft.
    const font = (el: Element) => getComputedStyle(el).fontFamily;
    expect(await words.evaluate(font)).toBe(await letter.evaluate(font));
    // Nothing spills off the screen.
    for (const part of [box, card, keep, use]) {
      expect(part.x).toBeGreaterThanOrEqual(0);
      expect(part.x + part.width).toBeLessThanOrEqual(screen.viewport.width);
    }
    const sideways = await page.evaluate(() => document.documentElement.scrollWidth);
    expect(sideways).toBeLessThanOrEqual(screen.viewport.width);
  });
}

test("a letter locked with a key gets no help", async ({ page }) => {
  await page.goto("/create");
  await page.getByLabel("Title").fill(uniqueTitle("Locked"));
  await page.getByLabel("Description").fill(DRAFT);
  await expect(askButton(page)).toBeVisible();

  await page.getByLabel("Lock with a key").check();
  await expect(panel(page)).toHaveCount(0);

  // The same for a saved locked letter, opened for editing.
  await page.getByRole("button", { name: "Save note" }).click();
  await expect(page).toHaveURL(/\/note\/[\w-]+$/);
  await page.goto(`${new URL(page.url()).pathname}/edit`);
  await expect(page.getByText("Locked with a key. Your changes are locked again")).toBeVisible();
  await expect(page.getByLabel("Description")).toHaveValue(DRAFT);
  await expect(panel(page)).toHaveCount(0);
});

test("switched off on the server, there's no button", async ({ page }) => {
  await page.route("**/api/features", (route) =>
    route.fulfill({ json: { emailCodes: true, aiHelp: false } }),
  );
  const features = page.waitForResponse("**/api/features");
  await page.goto("/create");
  await features;

  await page.getByLabel("Description").fill(DRAFT);
  await expect(page.getByLabel("Description")).toHaveValue(DRAFT);
  await expect(panel(page)).toHaveCount(0);
});

test("when Koinonia can't help, your words stay and you're told why", async ({ page }) => {
  await page.route("**/api/ai/help-me-write", (route) =>
    route.fulfill({
      status: 502,
      json: { error: { message: "Koinonia couldn't find the words just now. Please try again." } },
    }),
  );
  await page.goto("/create");
  await page.getByLabel("Description").fill(DRAFT);
  await expect(panel(page).getByText(/left today/)).toBeVisible();
  // A failed ask may still have cost one, so the panel asks the server again.
  const recount = page.waitForRequest(isCounting);
  await askButton(page).click();

  await expect(panel(page).getByRole("alert")).toContainText("couldn't find the words");
  await recount;
  await expect(page.getByLabel("Description")).toHaveValue(DRAFT);
  await expect(askButton(page)).toBeEnabled(); // you can try again
});
