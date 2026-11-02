import { expect, test } from "@playwright/test";
import { newRobot, signUp } from "./helpers";

test.use({ storageState: { cookies: [], origins: [] } });

test("a signed-out visitor is sent to the login page", async ({ page }) => {
  await page.goto("/trash");
  await expect(page).toHaveURL(/\/login$/);
});

test("a new user can sign up, sign out and sign back in", async ({ page }) => {
  const robot = newRobot();
  await signUp(page, robot);
  await expect(page.getByText(/good (morning|afternoon|evening), robot/i)).toBeVisible();

  await page.getByRole("button", { name: "Sign out" }).click();
  await expect(page).toHaveURL(/\/login$/);

  await page.getByLabel("Email").fill(robot.email);
  await page.getByLabel("Password").fill(robot.password);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Your desk of letters" })).toBeVisible();
});
