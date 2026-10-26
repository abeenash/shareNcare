import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { env } from "../env";
import * as schema from "./schema";

if (env.NODE_ENV === "test") {
  throw new Error("Tests must not use the real database. Is test/setup.ts preloaded?");
}

export const client = postgres(env.DATABASE_URL);
export const db = drizzle(client, { schema });
