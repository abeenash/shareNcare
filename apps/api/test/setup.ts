import { mock } from "bun:test";
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import * as schema from "../src/db/schema";

const testDb = drizzle(new PGlite(), { schema });
await migrate(testDb, { migrationsFolder: "./drizzle" });

mock.module("../src/db", () => ({ db: testDb }));
