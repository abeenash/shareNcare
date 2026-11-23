import { expect, test } from "@playwright/test";
import { uniqueTitle } from "./helpers";
import { reportAbout } from "./sentry-inbox";

const WORDS = "Meet me at the old banyan tree at six.";

const KEY = "q2Zt8vN4kX0bW7yLmP3sR9cT1uE6aH5jD-_fG2iK0oQ";

test("a crash on a share link reaches Sentry without the token, the key or the letter", async ({
  page,
  browser,
}) => {
  const created = await page.request.post("/api/notes", {
    data: { title: uniqueTitle("Banyan"), description: WORDS },
  });
  const { id } = await created.json();
  const shared = await page.request.post(`/api/notes/${id}/share`, { data: {} });
  const { shareToken } = await shared.json();

  const context = await browser.newContext({ storageState: { cookies: [], origins: [] } });
  const stranger = await context.newPage();
  await stranger.goto(`/s/${shareToken}#${KEY}`);
  await expect(stranger.getByText(WORDS)).toBeVisible();

  const message = `e2e crash ${crypto.randomUUID()}`;
  await stranger.evaluate((text) => {
    setTimeout(() => {
      throw new Error(text);
    });
  }, message);
  const report = await reportAbout(message);

  expect(report).toContain("/s/:token"); // the page address was sent, cleaned
  expect(report).not.toContain(shareToken);
  expect(report).not.toContain(KEY);
  expect(report).not.toContain(WORDS);
  expect(report).toContain(`"infer_ip":"never"`); // Sentry may not work out the IP address
});
