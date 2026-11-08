import { type Browser, expect, type Page, test } from "@playwright/test";
import { uniqueTitle } from "./helpers";

// A guest is a browser with no account: a fresh context with no cookies.
async function asGuest(browser: Browser) {
  const context = await browser.newContext({ storageState: { cookies: [], origins: [] } });
  return context.newPage();
}

async function makeBoard(page: Page) {
  const title = uniqueTitle("Farewell");
  await page.goto("/boards");
  await page.getByLabel("Title").fill(title);
  await page.getByLabel("Who is it for?").fill("Didi");
  await page.getByRole("button", { name: "Create board" }).click();
  await expect(page.getByRole("heading", { name: title })).toBeVisible();
  const link = await page.getByLabel("Board link").inputValue();
  return { title, link };
}

const noteWith = (page: Page, text: string) => page.getByRole("article").filter({ hasText: text });

async function postNote(page: Page, name: string, message: string) {
  await page.getByLabel("Your name").fill(name);
  await page.getByLabel("Your message").fill(message);
  await page.getByRole("button", { name: "Post my note" }).click();
  await expect(noteWith(page, message)).toBeVisible();
}

test("the board form says what is missing before anything is sent", async ({ page }) => {
  await page.goto("/boards");
  await page.getByRole("button", { name: "Create board" }).click();

  await expect(page.getByText("Give the board a title")).toBeVisible();
  await expect(page.getByText("Who is this board for?")).toBeVisible();

  await page.getByLabel("Title").fill("Get well soon");
  await expect(page.getByText("Give the board a title")).toBeHidden();
});

test("a guest posts a note and only that guest can delete it", async ({ page, browser }) => {
  const { title, link } = await makeBoard(page);
  const asha = await asGuest(browser);
  await asha.goto(link);
  await expect(asha.getByRole("heading", { name: title })).toBeVisible();

  await asha.getByRole("button", { name: "Post my note" }).click();
  await expect(asha.getByText("Add your name")).toBeVisible();
  await expect(asha.getByText("Write a few words")).toBeVisible();

  await postNote(asha, "Asha", "Thank you for every chai break.");
  await asha.reload();
  const ashasNote = noteWith(asha, "every chai break");
  await expect(ashasNote.getByRole("button", { name: "Delete my note" })).toBeVisible();

  const ravi = await asGuest(browser);
  await ravi.goto(link);
  const seenByRavi = noteWith(ravi, "every chai break");
  await expect(seenByRavi).toContainText("From · Asha");
  await expect(seenByRavi.getByRole("button", { name: "Delete my note" })).toBeHidden();
  await expect(seenByRavi.getByRole("button", { name: "Report" })).toBeVisible();

  await ashasNote.getByRole("button", { name: "Delete my note" }).click();
  await asha.getByRole("dialog").getByRole("button", { name: "Delete my note" }).click();
  await expect(ashasNote).toBeHidden();
});

test("reporting asks first, then thanks you", async ({ page, browser }) => {
  const { link } = await makeBoard(page);
  const asha = await asGuest(browser);
  await asha.goto(link);
  await postNote(asha, "Asha", "A note someone might report");

  const ravi = await asGuest(browser);
  await ravi.goto(link);
  await noteWith(ravi, "might report").getByRole("button", { name: "Report" }).click();
  await ravi.getByRole("dialog").getByRole("button", { name: "Report" }).click();
  await expect(ravi.getByText("The board's owner will take a look")).toBeVisible();
  await expect(
    noteWith(ravi, "might report").getByRole("button", { name: "Reported" }),
  ).toBeDisabled();

  await page.reload();
  await expect(noteWith(page, "might report")).toContainText("1 report");
});

test("the owner can hide a note, close the board and change the link", async ({
  page,
  browser,
}) => {
  const { link } = await makeBoard(page);
  const asha = await asGuest(browser);
  await asha.goto(link);
  await postNote(asha, "Troll", "Something unkind");

  await page.reload();
  await noteWith(page, "Something unkind").getByRole("button", { name: "Hide" }).click();
  await expect(noteWith(page, "Something unkind")).toContainText("Hidden from guests");
  await asha.reload();
  await expect(asha.getByText("No notes yet")).toBeVisible();

  await page.getByLabel("Taking new notes").uncheck();
  await expect(page.getByText("The board is closed to new notes")).toBeVisible();
  await asha.reload();
  await expect(asha.getByRole("heading", { name: "This board is closed" })).toBeVisible();
  await expect(asha.getByRole("button", { name: "Post my note" })).toBeHidden();

  await page.getByRole("button", { name: "New link" }).click();
  await page.getByRole("dialog").getByRole("button", { name: "New link" }).click();
  await expect(page.getByLabel("Board link")).not.toHaveValue(link);
  await asha.reload();
  await expect(asha.getByRole("heading", { name: "This board isn't here" })).toBeVisible();
});

test("deleting a board removes it from the list", async ({ page }) => {
  const { title } = await makeBoard(page);

  await page.getByRole("button", { name: "Delete this board" }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Delete board" }).click();

  await expect(page).toHaveURL(/\/boards$/);
  await expect(page.getByRole("heading", { name: "Care boards" })).toBeVisible();
  await expect(page.getByRole("link", { name: title })).toBeHidden();
});
