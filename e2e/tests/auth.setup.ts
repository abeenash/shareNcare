import { test as setup } from "@playwright/test";
import { newRobot, signUp } from "./helpers";

setup("sign up the robot that the other tests use", async ({ page }) => {
  await signUp(page, newRobot());
  await page.context().storageState({ path: "playwright/.auth/user.json" });
});
