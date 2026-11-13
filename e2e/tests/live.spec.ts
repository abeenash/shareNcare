import { type Browser, expect, type Page, test, type WebSocketRoute } from "@playwright/test";
import { newRobot, signUp, uniqueTitle } from "./helpers";

// Not one test in this file reloads a page. That is the whole point:
// everything people see here arrives over the live line by itself.

async function visitor(browser: Browser) {
  const context = await browser.newContext({ storageState: { cookies: [], origins: [] } });
  return context.newPage();
}

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
  return page.getByLabel("Board link").inputValue();
}

const isLive = (page: Page) => expect(page.getByText("Live", { exact: true })).toBeVisible();
const noteWith = (page: Page, text: string) => page.getByRole("article").filter({ hasText: text });

async function postNote(page: Page, message: string) {
  await page.getByLabel("Your message").fill(message);
  await page.getByRole("button", { name: "Post my note" }).click();
  await expect(noteWith(page, message)).toBeVisible();
}

test("a new note appears for everyone already looking, without a reload", async ({
  page,
  browser,
}) => {
  const link = await makeBoard(page);
  await isLive(page);

  const reader = await visitor(browser);
  await reader.goto(link);
  await isLive(reader);
  await expect(reader.getByText("No notes yet")).toBeVisible();

  const asha = await writer(browser, "Asha");
  await asha.goto(link);
  await postNote(asha, "Thank you for every chai break.");

  await expect(noteWith(reader, "every chai break")).toContainText("From · Asha");
  await expect(noteWith(page, "every chai break")).toBeVisible();
  await expect(reader.getByText("No notes yet")).toBeHidden();
});

test("the owner's hide, close and new link reach readers at once", async ({ page, browser }) => {
  const link = await makeBoard(page);
  const troll = await writer(browser, "Troll");
  await troll.goto(link);
  await postNote(troll, "Something unkind");

  const reader = await visitor(browser);
  await reader.goto(link);
  await isLive(reader);
  await expect(noteWith(reader, "Something unkind")).toBeVisible();

  await noteWith(page, "Something unkind").getByRole("button", { name: "Hide" }).click();
  await expect(noteWith(reader, "Something unkind")).toBeHidden();

  await page.getByLabel("Taking new notes").uncheck();
  await expect(reader.getByRole("heading", { name: "This board is closed" })).toBeVisible();
  await page.getByLabel("Taking new notes").check();
  await expect(reader.getByRole("heading", { name: "Add your note for Didi" })).toBeVisible();

  await page.getByRole("button", { name: "New link" }).click();
  await page.getByRole("dialog").getByRole("button", { name: "New link" }).click();
  await expect(reader.getByRole("heading", { name: "This board isn't here" })).toBeVisible();

  // The owner's page hung up too, then listened again on the new link.
  await expect(page.getByLabel("Board link")).not.toHaveValue(link);
  await isLive(page);
  const newLink = await page.getByLabel("Board link").inputValue();
  const ravi = await writer(browser, "Ravi");
  await ravi.goto(newLink);
  await postNote(ravi, "Through the new link");
  await expect(noteWith(page, "Through the new link")).toBeVisible();
});

test("a dropped line comes back by itself, and catches up on what it missed", async ({
  page,
  browser,
}) => {
  const link = await makeBoard(page);
  const asha = await writer(browser, "Asha");
  await asha.goto(link);
  const reader = await visitor(browser);

  // Stand in the middle of the reader's live line, so the test can cut it
  // and keep it cut for a while.
  let line: WebSocketRoute | undefined;
  let cut = false;
  await reader.routeWebSocket(/\/live$/, (socket) => {
    if (cut) {
      socket.close({ code: 1011, reason: "Still cut" });
      return;
    }
    line = socket;
    socket.connectToServer();
  });
  await reader.goto(link);
  await isLive(reader);

  cut = true;
  await line?.close({ code: 1001, reason: "Test cut the line" });
  await expect(reader.getByText("Connecting", { exact: true })).toBeVisible();
  await postNote(asha, "Posted while you were away");

  // The reader really missed it: the line is down and nothing reloads the page.
  await reader.waitForTimeout(1500);
  await expect(noteWith(reader, "Posted while you were away")).toBeHidden();

  cut = false;
  await isLive(reader);
  await expect(noteWith(reader, "Posted while you were away")).toBeVisible();
});
