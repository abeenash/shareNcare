import { type Browser, expect, type Page, test } from "@playwright/test";
import { newRobot, signUp, uniqueTitle } from "./helpers";

// A visitor is a separate browser with no account and no cookies.
async function visitor(browser: Browser) {
  const context = await browser.newContext({ storageState: { cookies: [], origins: [] } });
  return context.newPage();
}

// A writer is a visitor who has made an account.
async function writer(browser: Browser, name: string) {
  const page = await visitor(browser);
  await signUp(page, { ...newRobot(), name });
  return page;
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

async function postNote(page: Page, message: string) {
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

test("a visitor reads freely, signs up from the board, and comes back to write", async ({
  page,
  browser,
}) => {
  const { title, link } = await makeBoard(page);
  const asha = await visitor(browser);
  await asha.goto(link);
  await expect(asha.getByRole("heading", { name: title })).toBeVisible();
  await expect(asha.getByRole("button", { name: "Post my note" })).toBeHidden();

  await asha.getByRole("link", { name: "Sign in to write a note" }).click();
  await expect(asha).toHaveURL(/\/login\?next=/);
  const robot = { ...newRobot(), name: "Asha Rai" };
  await asha.getByRole("button", { name: "New here? Create an account" }).click();
  await asha.getByLabel("Name").fill(robot.name);
  await asha.getByLabel("Email").fill(robot.email);
  await asha.getByLabel("Password").fill(robot.password);
  await asha.getByRole("button", { name: "Sign up" }).click();

  await expect(asha).toHaveURL(link);
  await asha.getByRole("button", { name: "Post my note" }).click();
  await expect(asha.getByText("Write a few words")).toBeVisible();

  await postNote(asha, "Thank you for every chai break.");
  await expect(noteWith(asha, "every chai break")).toContainText("From · Asha");
  await expect(asha.getByRole("heading", { name: "Your note is on the board" })).toBeVisible();
  await expect(asha.getByRole("button", { name: "Post my note" })).toBeHidden();
});

test("one note each, and only its writer can delete it", async ({ page, browser }) => {
  const { link } = await makeBoard(page);
  const asha = await writer(browser, "Asha");
  await asha.goto(link);
  await postNote(asha, "Good luck in Pokhara!");

  const ravi = await writer(browser, "Ravi");
  await ravi.goto(link);
  const seenByRavi = noteWith(ravi, "Pokhara");
  await expect(seenByRavi.getByRole("button", { name: "Delete my note" })).toBeHidden();
  await expect(seenByRavi.getByRole("button", { name: "Report" })).toBeVisible();

  await asha.reload();
  await noteWith(asha, "Pokhara").getByRole("button", { name: "Delete my note" }).click();
  await asha.getByRole("dialog").getByRole("button", { name: "Delete my note" }).click();
  await expect(noteWith(asha, "Pokhara")).toBeHidden();
  await expect(asha.getByRole("button", { name: "Post my note" })).toBeVisible();
});

test("reporting asks first, then thanks you, even without an account", async ({
  page,
  browser,
}) => {
  const { link } = await makeBoard(page);
  const asha = await writer(browser, "Asha");
  await asha.goto(link);
  await postNote(asha, "A note someone might report");

  const stranger = await visitor(browser);
  await stranger.goto(link);
  await noteWith(stranger, "might report").getByRole("button", { name: "Report" }).click();
  await stranger.getByRole("dialog").getByRole("button", { name: "Report" }).click();
  await expect(stranger.getByText("The board's owner will take a look")).toBeVisible();
  await expect(
    noteWith(stranger, "might report").getByRole("button", { name: "Reported" }),
  ).toBeDisabled();

  await page.reload();
  await expect(noteWith(page, "might report")).toContainText("1 report");
});

test("the owner can hide a note, close the board and change the link", async ({
  page,
  browser,
}) => {
  const { link } = await makeBoard(page);
  const troll = await writer(browser, "Troll");
  await troll.goto(link);
  await postNote(troll, "Something unkind");

  await page.reload();
  await noteWith(page, "Something unkind").getByRole("button", { name: "Hide" }).click();
  await expect(noteWith(page, "Something unkind")).toContainText("Hidden from guests");
  await troll.reload();
  await expect(troll.getByText("No notes yet")).toBeVisible();
  await expect(troll.getByRole("heading", { name: "Your note is hidden for now" })).toBeVisible();

  await page.getByLabel("Taking new notes").uncheck();
  await expect(page.getByText("The board is closed to new notes")).toBeVisible();
  await troll.reload();
  await expect(troll.getByRole("heading", { name: "This board is closed" })).toBeVisible();

  await page.getByRole("button", { name: "New link" }).click();
  await page.getByRole("dialog").getByRole("button", { name: "New link" }).click();
  await expect(page.getByLabel("Board link")).not.toHaveValue(link);
  await troll.reload();
  await expect(troll.getByRole("heading", { name: "This board isn't here" })).toBeVisible();
});

test("deleting a board removes it from the list", async ({ page }) => {
  const { title } = await makeBoard(page);

  await page.getByRole("button", { name: "Delete this board" }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Delete board" }).click();

  await expect(page).toHaveURL(/\/boards$/);
  await expect(page.getByRole("heading", { name: "Care boards" })).toBeVisible();
  await expect(page.getByRole("link", { name: title })).toBeHidden();
});
