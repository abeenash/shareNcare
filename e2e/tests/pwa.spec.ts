import { appendFile, readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { expect, type Page, test } from "@playwright/test";

// The file the server hands out as the service worker (built by `bun run build`).
const servedWorker = fileURLToPath(new URL("../../apps/web/dist/sw.js", import.meta.url));

const desk = (page: Page) => page.getByRole("heading", { name: "Your desk of letters" });
const banner = (page: Page) => page.getByRole("status").filter({ hasText: "A new version" });

// Waits until the service worker is in charge of this page, like a second visit.
async function installed(page: Page) {
  await page.goto("/");
  await expect(desk(page)).toBeVisible();
  await page.evaluate(() => navigator.serviceWorker.ready);
  await page.reload();
  await expect
    .poll(() => page.evaluate(() => Boolean(navigator.serviceWorker.controller)))
    .toBe(true);
  await expect(desk(page)).toBeVisible();
}

// Every address the service worker keeps a copy of.
const keptCopies = (page: Page) =>
  page.evaluate(async () => {
    const paths: string[] = [];
    for (const name of await caches.keys()) {
      const cache = await caches.open(name);
      for (const request of await cache.keys()) paths.push(new URL(request.url).pathname);
    }
    return paths;
  });

test("a phone can install it: manifest, icons, and the colours of the top bar", async ({
  page,
}) => {
  await page.goto("/login");
  await expect(page.locator('meta[name="theme-color"]')).toHaveAttribute("content", "#0b1220");
  await expect(page.locator('link[rel="apple-touch-icon"]')).toHaveAttribute(
    "href",
    "/apple-touch-icon-180x180.png",
  );

  const href = await page.locator('link[rel="manifest"]').getAttribute("href");
  const manifest = await (await page.request.get(href ?? "")).json();
  expect(manifest).toMatchObject({
    name: "ShareNCare",
    start_url: "/",
    display: "standalone",
    theme_color: "#0b1220",
  });
  const sizes = manifest.icons.map((icon: { sizes: string }) => icon.sizes);
  expect(sizes).toEqual(expect.arrayContaining(["192x192", "512x512"]));
  expect(manifest.icons.some((icon: { purpose?: string }) => icon.purpose === "maskable")).toBe(
    true,
  );

  for (const src of [
    ...manifest.icons.map((icon: { src: string }) => `/${icon.src}`),
    "/apple-touch-icon-180x180.png",
  ]) {
    const icon = await page.request.get(src);
    expect(icon.status(), src).toBe(200);
    expect(icon.headers()["content-type"], src).toContain("image/png");
  }
});

test.describe("once installed", () => {
  // One at a time: the update test changes the file the others install.
  test.describe.configure({ mode: "serial" });

  test("it opens from its own copy, even offline", async ({ page, context }) => {
    await installed(page);

    await context.setOffline(true);
    await page.reload();
    // Without a copy, the browser would show its own "no internet" page instead of ours.
    await expect(page).toHaveTitle("ShareNCare");
    await expect(page.locator("#root")).not.toBeEmpty();
  });

  test("letters never go into its copy, only the app's own files", async ({ page }) => {
    await installed(page);
    await page.getByRole("link", { name: "Trash" }).first().click(); // more letters asked for

    const kept = await keptCopies(page);
    expect(kept).toContain("/index.html");
    expect(kept.filter((path) => path.startsWith("/api/"))).toEqual([]);
  });

  test("addresses under /api always reach the server", async ({ page }) => {
    await installed(page);

    // Google's sign-in callback is one of these. Answering it with the app would break sign-in.
    await page.goto("/api/health");
    expect(await page.locator("body").innerText()).toContain('"ok":true');
  });

  test("a new version asks before it reloads", async ({ page }) => {
    await installed(page);

    // Pretend we deployed: the service worker file is now one comment different.
    const deployed = await readFile(servedWorker, "utf8");
    try {
      await appendFile(servedWorker, "\n// next deploy\n");
      await page.evaluate(async () => (await navigator.serviceWorker.ready).update());

      await expect(banner(page)).toBeVisible();
      await banner(page).getByRole("button", { name: "Later" }).click();
      await expect(banner(page)).toBeHidden();
      await expect(desk(page)).toBeVisible(); // nothing reloaded behind your back

      await page.reload();
      await expect(banner(page)).toBeVisible();
      await banner(page).getByRole("button", { name: "Reload" }).click();
      await expect(banner(page)).toBeHidden();
      await expect(desk(page)).toBeVisible();
      // The new version is now the one in charge, not left waiting.
      const stillWaiting = () =>
        page.evaluate(async () => Boolean((await navigator.serviceWorker.ready).waiting));
      await expect.poll(stillWaiting).toBe(false);
    } finally {
      await writeFile(servedWorker, deployed);
    }
  });
});

test("while the free server wakes up, Koinonia says so", async ({ page }) => {
  await page.route("**/api/auth/get-session*", async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 6000));
    await route.continue();
  });
  await page.goto("/");

  await expect(page.getByText("Koinonia is waking the server up.")).toBeVisible();
  await expect(desk(page)).toBeVisible();
  await expect(page.getByText("Koinonia is waking the server up.")).toBeHidden();
});
