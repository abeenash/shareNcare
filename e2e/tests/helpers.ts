import { expect, type Page } from "@playwright/test";

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

export async function signUp(page: Page, robot: Robot) {
  await page.goto("/login");
  await page.getByRole("button", { name: "New here? Create an account" }).click();
  await page.getByLabel("Name").fill(robot.name);
  await page.getByLabel("Email").fill(robot.email);
  await page.getByLabel("Password").fill(robot.password);
  await page.getByRole("button", { name: "Sign up" }).click();
  await expect(page.getByRole("heading", { name: "Your desk of letters" })).toBeVisible();
}

export const uniqueTitle = (label: string) => `${label} ${crypto.randomUUID().slice(0, 8)}`;
