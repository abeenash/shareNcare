//throwaway values for the throwaway test server. They guard nothing real
export const databaseUrl =
  process.env.E2E_DATABASE_URL ?? "postgres://postgres:postgres@localhost:5433/postgres";

export const cronSecret = "e2e-only-cron-secret-guards-nothing-0123456789";
