import { mock } from "bun:test";
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import type { Context, Next } from "hono";
import { HTTPException } from "hono/http-exception";
import * as schema from "../src/db/schema";
import { TEST_CRON_SECRET } from "./cron-secret";
import { fakePhotos } from "./fake-photos";

mock.module("../src/env", () => ({
  env: {
    CRON_SECRET: TEST_CRON_SECRET,
    BETTER_AUTH_SECRET: "test-only-auth-secret-0123456789abcdef",
    BETTER_AUTH_URL: "http://localhost:5173",
  },
}));

mock.module("../src/lib/client-ip", () => ({
  clientIp: (c: Context) => c.req.header("x-test-ip") ?? "127.0.0.1",
}));

const testDb = drizzle(new PGlite(), { schema });
await migrate(testDb, { migrationsFolder: "./drizzle" });

const now = new Date();
await testDb.insert(schema.user).values([
  { id: "alice", name: "Alice", email: "alice@test.dev", createdAt: now, updatedAt: now },
  { id: "bob", name: "Bob", email: "bob@test.dev", createdAt: now, updatedAt: now },
]);

mock.module("../src/db", () => ({ db: testDb }));

mock.module("../src/lib/photos", () => ({ photos: fakePhotos }));

mock.module("../src/middleware/rate-limit", () => ({
  rateLimit: async (_c: Context, next: Next) => {
    await next();
  },
}));

mock.module("../src/auth", () => ({
  auth: { handler: () => new Response(null, { status: 404 }) },
}));

mock.module("../src/middleware/require-user", () => ({
  requireUser: async (c: Context, next: Next) => {
    const id = c.req.header("x-test-user") ?? "alice";
    if (id === "nobody") throw new HTTPException(401, { message: "Please sign in first" });
    c.set("user", { id, name: id, email: `${id}@test.dev` });
    await next();
  },
  optionalUser: async (c: Context, next: Next) => {
    const id = c.req.header("x-test-user");
    c.set("user", id && id !== "nobody" ? { id, name: id, email: `${id}@test.dev` } : null);
    await next();
  },
}));
