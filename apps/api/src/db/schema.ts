import { sql } from "drizzle-orm";
import { boolean, index, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { user } from "./auth-schema";

export * from "./auth-schema";

export const notes = pgTable(
  "notes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id").references(() => user.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    description: text("description").notNull(),
    pinned: boolean("pinned").notNull().default(false),
    recipient: text("recipient"),
    shareToken: text("share_token").unique(),
    burnAfterReading: boolean("burn_after_reading").notNull().default(false),
    burnedAt: timestamp("burned_at", { withTimezone: true }),
    unsealAt: timestamp("unseal_at", { withTimezone: true }),
    photoKey: text("photo_key"),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    index("notes_user_id_idx").on(table.userId),
    index("notes_in_trash_idx").on(table.deletedAt).where(sql`${table.deletedAt} is not null`),
  ],
);

export type Note = typeof notes.$inferSelect;
export type NewNote = typeof notes.$inferInsert;
