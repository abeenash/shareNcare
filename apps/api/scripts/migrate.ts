import { migrate } from "drizzle-orm/postgres-js/migrator";
import { client, db } from "../src/db";

try {
  await migrate(db, { migrationsFolder: "./drizzle" });
  console.log("✅ Database migrations are up to date");
} catch (error) {
  console.error("❌ Migration failed:", error);
  process.exitCode = 1;
} finally {
  await client.end();
}
