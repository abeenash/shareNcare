import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { expect } from "@playwright/test";
import { sentryInboxDir } from "./e2e-env";

// Every report the pretend Sentry got, as the raw text that crossed the network.
async function allReports() {
  const names = await readdir(sentryInboxDir).catch(() => []);
  return Promise.all(names.map((name) => readFile(join(sentryInboxDir, name), "utf-8")));
}

// Waits for the report about one error message, and returns exactly what was sent.
export async function reportAbout(message: string) {
  let found = "";
  await expect
    .poll(
      async () => {
        found = (await allReports()).find((text) => text.includes(message)) ?? "";
        return found;
      },
      { message: `waiting for a Sentry report about "${message}"` },
    )
    .not.toBe("");
  return found;
}
