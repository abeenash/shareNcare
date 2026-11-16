import { expect, type Page } from "@playwright/test";
import { codeFor } from "./mailbox";

export type Robot = {
  name: string;
  email: string;
  password: string;
};

export const newRobot = (): Robot => ({
  name: "Robot",
  email: `robot-${crypto.randomUUID()}@e2e.test`,
  password: crypto.randomUUID(),
});

export async function startSignUp(page: Page, robot: Robot) {
  await page.goto("/login");
  await fillSignUp(page, robot);
}

export async function fillSignUp(page: Page, robot: Robot) {
  await page.getByRole("button", { name: "New here? Create an account" }).click();
  await page.getByLabel("Name").fill(robot.name);
  await page.getByLabel("Email").fill(robot.email);
  await page.getByLabel("Password").fill(robot.password);
  await page.getByRole("button", { name: "Sign up" }).click();
  await expect(page.getByRole("heading", { name: "Check your email" })).toBeVisible();
}

export async function confirmEmail(page: Page, email: string, count = 1) {
  await page.getByLabel("6-digit code").fill(await codeFor(email, count));
  await page.getByRole("button", { name: "Confirm" }).click();
}

export async function signUp(page: Page, robot: Robot) {
  await startSignUp(page, robot);
  await confirmEmail(page, robot.email);
  await expect(page.getByRole("heading", { name: "Your desk of letters" })).toBeVisible();
}

export const uniqueTitle = (label: string) => `${label} ${crypto.randomUUID().slice(0, 8)}`;
