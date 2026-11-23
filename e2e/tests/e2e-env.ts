import { fileURLToPath } from "node:url";

//throwaway values for the throwaway test server. They guard nothing real
export const databaseUrl =
  process.env.E2E_DATABASE_URL ?? "postgres://postgres:postgres@localhost:5433/postgres";

export const cronSecret = "e2e-only-cron-secret-guards-nothing-0123456789";

//where the test server writes its emails (MAIL_TRANSPORT=file). This is ignored by Git
export const outboxDir = fileURLToPath(new URL("../playwright/outbox", import.meta.url));

// A pretend Sentry (scripts/fake-sentry.ts). It saves every report it gets in this folder,
// so a test can read exactly what would have left for the real Sentry.
export const SENTRY_PORT = 4100;
export const sentryDsn = `http://e2epublickey@localhost:${SENTRY_PORT}/1`;
export const sentryInboxDir = fileURLToPath(new URL("../playwright/sentry-inbox", import.meta.url));
