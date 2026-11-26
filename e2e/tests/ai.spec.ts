import { type Browser, expect, type Page, test } from "@playwright/test";
import { newRobot, signUp, uniqueTitle } from "./helpers";

// What the practice model always answers (FAKE_SUGGESTION in apps/api/src/lib/ai.ts).
const FAKE_SUGGESTION =
  "This is a practice suggestion from the fake model. A real AI would rewrite your letter here.";
const DRAFT = "Didi, thank you for the cardamom tea. You are the best.";

// Everyone gets 3 suggestions a day, so a test that really asks uses a brand-new person.
async function newPerson(browser: Browser, options: { timezoneId?: string } = {}) {
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

test("three a day, then a friendly no that says when, on your own clock", async ({ browser }) => {
  const page = await newPerson(browser, { timezoneId: "Asia/Kathmandu" });
  await page.goto("/create");
  await page.getByLabel("Description").fill(DRAFT);

  for (const left of [2, 1, 0]) {
    await askButton(page).click();
    await expect(panel(page).getByText(`${left} left today`)).toBeVisible();
    await panel(page).getByRole("button", { name: "Keep mine" }).click();
  }

  await askButton(page).click();
  const alert = panel(page).getByRole("alert");
  await expect(alert).toContainText("You've used your 3 free suggestions for today.");
  // Midnight UTC, from the Retry-After header, shown in Nepal time.
  await expect(alert).toContainText("That's 5:45 AM for you.");
  await expect(askButton(page)).toBeDisabled();
  await expect(page.getByLabel("Description")).toHaveValue(DRAFT);
});

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
  await askButton(page).click();

  await expect(panel(page).getByRole("alert")).toContainText("couldn't find the words");
  await expect(page.getByLabel("Description")).toHaveValue(DRAFT);
  await expect(askButton(page)).toBeEnabled(); // you can try again
});
