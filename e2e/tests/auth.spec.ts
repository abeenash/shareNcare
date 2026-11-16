import { expect, type Page, test } from "@playwright/test";
import { confirmEmail, newRobot, type Robot, signUp, startSignUp } from "./helpers";
import { codeFor } from "./mailbox";

test.use({ storageState: { cookies: [], origins: [] } });

const desk = (page: Page) => page.getByRole("heading", { name: "Your desk of letters" });

async function signIn(page: Page, robot: Pick<Robot, "email" | "password">) {
  await page.getByLabel("Email").fill(robot.email);
  await page.getByLabel("Password").fill(robot.password);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
}

test("a signed-out visitor is sent to the login page", async ({ page }) => {
  await page.goto("/trash");
  await expect(page).toHaveURL(/\/login\?next=%2Ftrash$/);
});

test("a new user can sign up, sign out and sign back in", async ({ page }) => {
  const robot = newRobot();
  await signUp(page, robot);
  await expect(page.getByText(/good (morning|afternoon|evening), robot/i)).toBeVisible();

  await page.getByRole("button", { name: "Sign out" }).click();
  await expect(page).toHaveURL(/\/login$/);

  await signIn(page, robot);
  await expect(desk(page)).toBeVisible();
});

test("a wrong code is refused, and the right one still works", async ({ page }) => {
  const robot = newRobot();
  await startSignUp(page, robot);
  const code = await codeFor(robot.email);

  await page.getByLabel("6-digit code").fill(code === "000000" ? "111111" : "000000");
  await page.getByRole("button", { name: "Confirm" }).click();
  await expect(page.getByText(/code isn't right/i)).toBeVisible();
  await expect(page.getByRole("heading", { name: "Check your email" })).toBeVisible();

  await confirmEmail(page, robot.email);
  await expect(desk(page)).toBeVisible();
});

test("signing in before confirming sends a fresh code", async ({ page }) => {
  const robot = newRobot();
  await startSignUp(page, robot); // email #1, never typed in

  await page.goto("/login");
  await signIn(page, robot);
  await expect(page.getByText(/isn't confirmed yet/i)).toBeVisible();

  await confirmEmail(page, robot.email, 2); // email #2, sent by the sign-in
  await expect(desk(page)).toBeVisible();
});

test("a forgotten password is reset with an emailed code", async ({ page }) => {
  const robot = newRobot();
  await signUp(page, robot); // email #1 confirmed the address
  await page.getByRole("button", { name: "Sign out" }).click();

  await page.getByLabel("Email").fill(robot.email);
  await page.getByRole("link", { name: "Forgot password?" }).click();
  await expect(page.getByLabel("Email")).toHaveValue(robot.email); // carried over
  await page.getByRole("button", { name: "Send code" }).click();

  const newPassword = "a brand new long password";
  await page.getByLabel("6-digit code").fill(await codeFor(robot.email, 2));
  await page.getByLabel("New password").fill(newPassword);
  await page.getByRole("button", { name: "Save new password" }).click();
  await expect(page).toHaveURL(/\/login$/);

  await signIn(page, { email: robot.email, password: newPassword });
  await expect(desk(page)).toBeVisible();
});
