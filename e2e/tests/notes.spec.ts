import { expect, type Page, test } from "@playwright/test";
import { uniqueTitle } from "./helpers";

async function createNote(page: Page, title: string, description = "Written by a robot") {
  const res = await page.request.post("/api/notes", { data: { title, description } });
  expect(res.status()).toBe(201);
}

const cardFor = (page: Page, title: string) => page.getByRole("article").filter({ hasText: title });

test("writing a note opens it in full, line breaks and all", async ({ page }) => {
  const title = uniqueTitle("Day 12");
  const description = "First paragraph.\n\nSecond paragraph, after an empty line.";

  await page.goto("/");
  await page.getByRole("link", { name: "New note" }).click();
  await page.getByLabel("Title").fill(title);
  await page.getByLabel("Description").fill(description);
  await page.getByRole("button", { name: "Save note" }).click();

  await expect(page.getByRole("heading", { name: title })).toBeVisible();

  expect(await page.getByText("First paragraph.").innerText()).toBe(description);

  await page.getByRole("link", { name: "Your desk" }).first().click();
  await cardFor(page, title).getByRole("link", { name: title }).click();
  await expect(page).toHaveURL(/\/note\/[\w-]+$/);
});

test("the pencil on a card opens the editor", async ({ page }) => {
  const title = uniqueTitle("Edit me");
  await createNote(page, title);

  await page.goto("/");
  await cardFor(page, title).getByRole("link", { name: "Edit note" }).click();
  await expect(page.getByLabel("Title")).toHaveValue(title);

  await page.getByLabel("Title").fill(`${title} (edited)`);
  await page.getByRole("button", { name: "Save changes" }).click();

  await expect(page.getByRole("heading", { name: `${title} (edited)` })).toBeVisible();
});

test("a trashed note can be restores", async ({ page }) => {
  const title = uniqueTitle("Trash me");
  await createNote(page, title);

  await page.goto("/");
  await cardFor(page, title).getByRole("button", { name: "Move note to trash" }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Move to trash" }).click();
  await expect(cardFor(page, title)).toBeHidden();

  await page.getByRole("navigation").getByRole("link", { name: /trash/i }).click();
  await cardFor(page, title).getByRole("button", { name: "Restore" }).click();
  await expect(cardFor(page, title)).toBeHidden();

  await page
    .getByRole("navigation")
    .getByRole("link", { name: /your desk/i })
    .click();
  await expect(cardFor(page, title)).toBeVisible();
});
