import { defineConfig, devices } from "@playwright/test";

const PORT = 4000;
const baseURL = `http://localhost:${PORT}`;
const isCI = Boolean(process.env.CI);

const databaseUrl =
  process.env.E2E_DATABASE_URL ?? "postgres://postgres:postgres@localhost:5433/postgres";

const databaseHost = new URL(databaseUrl).hostname;
if (databaseHost !== "localhost" && databaseHost !== "127.0.0.1") {
  throw new Error(`E2E tests only run against a local database, not ${databaseHost}`);
}

export default defineConfig({
  testDir: "./tests",
  fullyParallel: true,
  forbidOnly: isCI,
  retries: isCI ? 1 : 0,
  reporter: isCI ? [["github"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL,
    trace: "retain-on-failure",
  },
  projects: [
    { name: "setup", testMatch: /.*\.setup\.ts/ },
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"], storageState: "playwright/.auth/user.json" },
      dependencies: ["setup"],
    },
  ],
  webServer: {
    command: "bun run build && bun run start",
    cwd: "..",
    url: `${baseURL}/api/health`,
    reuseExistingServer: !isCI,
    timeout: 120_000,
    env: {
      NODE_ENV: "production",
      PORT: String(PORT),
      DATABASE_URL: databaseUrl,
      BETTER_AUTH_URL: baseURL,
      BETTER_AUTH_SECRET: "e2e-only-secret-that-guards-nothing-real-0123456789",
      GOOGLE_CLIENT_ID: "not-used-in-e2e",
      GOOGLE_CLIENT_SECRET: "not-used-in-e2e",
      UPSTASH_REDIS_REST_URL: "https://not-used-in-e2e.invalid",
      UPSTASH_REDIS_REST_TOKEN: "not-used-in-e2e",
      RATE_LIMIT: "off",
    },
  },
});
