import { mock } from "bun:test";
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import type { Context, Next } from "hono";
import * as schema from "../src/db/schema";

const testDb = drizzle(new PGlite(), { schema });
await migrate(testDb, { migrationsFolder: "./drizzle" });

const now = new Date();
await testDb.insert(schema.user).values([
  { id: "alice", name: "Alice", email: "alice@test.dev", createdAt: now, updatedAt: now },
  { id: "bob", name: "Bob", email: "bob@test.dev", createdAt: now, updatedAt: now },
]);

mock.module("../src/db", () => ({ db: testDb }));

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
    c.set("user", { id, name: id, email: `${id}@test.dev` });
    await next();
  },
}));
