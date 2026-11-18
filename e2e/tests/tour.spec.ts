import { type Browser, expect, type Page, test } from "@playwright/test";
import { confirmEmail, newRobot, type Robot, skipTour, startSignUp } from "./helpers";

test.use({ storageState: { cookies: [], origins: [] } });

const tour = (page: Page) => page.getByRole("dialog");

async function newPerson(page: Page) {
  const robot = newRobot();
  await startSignUp(page, robot);
  await confirmEmail(page, robot.email);
  return robot;
}

// The same account, signed in fresh in a separate browser: another device.
async function onAnotherDevice(browser: Browser, robot: Robot) {
  const page = await (await browser.newContext()).newPage();
  await page.goto("/login");
  await page.getByLabel("Email").fill(robot.email);
  await page.getByLabel("Password").fill(robot.password);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Your desk of letters" })).toBeVisible();
  return page;
}

test("a new person meets Koinonia, walks the tour, and it stays done", async ({
  page,
  browser,
}) => {
  const robot = await newPerson(page);

  await expect(tour(page).getByRole("heading", { name: "Hi Robot, I'm Koinonia" })).toBeVisible();
  await tour(page).getByRole("button", { name: "Show me around" }).click();

  await expect(tour(page).getByRole("heading", { name: "Write a letter" })).toBeVisible();
  await expect(page.getByTestId("tour-spotlight")).toBeVisible();
  await tour(page).getByRole("button", { name: "Next" }).click();

  await expect(tour(page).getByRole("heading", { name: "Care boards" })).toBeVisible();
  await tour(page).getByRole("button", { name: "Next" }).click();

  await expect(tour(page).getByRole("heading", { name: "Your desk is ready" })).toBeVisible();
  const saved = page.waitForResponse((res) => res.url().endsWith("/api/me/tour-seen"));
  await tour(page).getByRole("button", { name: "Write my first letter" }).click();
  await saved;
  await expect(page).toHaveURL(/\/create$/);

  const phone = await onAnotherDevice(browser, robot);
  await expect(phone.getByRole("dialog")).toHaveCount(0);
});

test("Escape skips the tour, and the sidebar can bring it back", async ({ page }) => {
  await newPerson(page);
  await expect(tour(page)).toBeVisible();

  const saved = page.waitForResponse((res) => res.url().endsWith("/api/me/tour-seen"));
  await page.keyboard.press("Escape");
  await saved;
  await expect(tour(page)).toBeHidden();

  await page.reload();
  await expect(page.getByRole("heading", { name: "Your desk of letters" })).toBeVisible();
  await expect(tour(page)).toHaveCount(0);

  await page.getByRole("button", { name: "Take the tour again" }).click();
  await expect(tour(page).getByRole("heading", { name: "Hi Robot, I'm Koinonia" })).toBeVisible();
  await skipTour(page);
});

test("on a small phone, the card fits and Care boards points at the menu", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 667 });
  await newPerson(page);

  // The whole card is on screen: not cut off on any side.
  const card = await page.getByTestId("tour-card").boundingBox();
  expect(card).not.toBeNull();
  if (card) {
    expect(card.x).toBeGreaterThanOrEqual(0);
    expect(card.y).toBeGreaterThanOrEqual(0);
    expect(card.x + card.width).toBeLessThanOrEqual(375);
    expect(card.y + card.height).toBeLessThanOrEqual(667);
  }

  await tour(page).getByRole("button", { name: "Show me around" }).click();
  await tour(page).getByRole("button", { name: "Next" }).click();
  await expect(tour(page).getByText("They live in the menu.")).toBeVisible();

  // The spotlight sits around the menu button, which is still where it was.
  const menu = await page.getByLabel("Open sidebar").boundingBox();
  const spotlight = await page.getByTestId("tour-spotlight").boundingBox();
  expect(menu && spotlight).toBeTruthy();
  if (menu && spotlight) {
    expect(spotlight.x).toBeLessThanOrEqual(menu.x);
    expect(spotlight.y).toBeLessThanOrEqual(menu.y);
    expect(spotlight.x + spotlight.width).toBeGreaterThanOrEqual(menu.x + menu.width);
    expect(spotlight.y + spotlight.height).toBeGreaterThanOrEqual(menu.y + menu.height);
  }
});
