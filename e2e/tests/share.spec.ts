import { expect, type Page, test } from "@playwright/test";
import { uniqueTitle } from "./helpers";

async function createSharedNote(page: Page, note: { title: string; recipient: string }) {
  const created = await page.request.post("/api/notes", {
    data: { ...note, description: "Thank you for everything, Didi." },
  });
  const { id } = await created.json();
  const shared = await page.request.post(`/api/notes/${id}/share`);
  const { shareToken } = await shared.json();
  return shareToken as string;
}

test("a stranger can open a shared letter until sharing stops", async ({ page, browser }) => {
  const title = uniqueTitle("For Didi");

  await page.goto("/create");
  await page.getByLabel("To", { exact: true }).fill("Didi");
  await page.getByLabel("Title").fill(title);
  await page.getByLabel("Description").fill("Thank you for everything.");
  await page.getByRole("button", { name: "Save note" }).click();

  await page.getByRole("button", { name: "Share", exact: true }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Create link" }).click();
  const link = await page.getByRole("textbox", { name: "Share link" }).inputValue();

  //this is a brand new browser with no cookies; someone who has never heard of ShareNCare.
  const stranger = await browser.newContext({ storageState: { cookies: [], origins: [] } });
  const strangerPage = await stranger.newPage();
  await strangerPage.goto(link);
  await expect(strangerPage.getByRole("heading", { name: title })).toBeVisible();
  await expect(strangerPage.getByText("To · Didi")).toBeVisible();
  await expect(strangerPage.getByText("From · Robot")).toBeVisible();

  await page.getByRole("dialog").getByRole("button", { name: "Stop sharing" }).click();
  await expect(page.getByRole("dialog").getByRole("button", { name: "Create link" })).toBeVisible();

  await strangerPage.reload();
  await expect(strangerPage.getByRole("heading", { name: "This letter isn't here" })).toBeVisible();
  await stranger.close();
});

test("the link preview names the recipient but never shows the letter", async ({ page }) => {
  const token = await createSharedNote(page, {
    title: uniqueTitle("Secret"),
    recipient: "Didi <3",
  });

  const html = await (await page.request.get(`/s/${token}`)).text();

  expect(html).toContain('<meta property="og:title" content="A letter for Didi &lt;3" />');
  expect(html).not.toContain("Thank you for everything");
});
