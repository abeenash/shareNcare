import { fileURLToPath } from "node:url";

//throwaway values for the throwaway test server. They guard nothing real
export const databaseUrl =
  process.env.E2E_DATABASE_URL ?? "postgres://postgres:postgres@localhost:5433/postgres";

export const cronSecret = "e2e-only-cron-secret-guards-nothing-0123456789";

//where the test server writes its emails (MAIL_TRANSPORT=file). This is ignored by Git
export const outboxDir = fileURLToPath(new URL("../playwright/outbox", import.meta.url));
