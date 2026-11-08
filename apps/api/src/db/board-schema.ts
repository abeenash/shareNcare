import type { BoardColor } from "@sharencare/shared";
import { relations } from "drizzle-orm";
import { index, pgTable, primaryKey, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { user } from "./auth-schema";

export const boards = pgTable(
  "boards",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    ownerId: text("owner_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    recipient: text("recipient").notNull(),
    token: text("token").notNull().unique(),
    closedAt: timestamp("closed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("boards_owner_id_idx").on(table.ownerId)],
);

export const boardNotes = pgTable(
  "board_notes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    boardId: uuid("board_id")
      .notNull()
      .references(() => boards.id, { onDelete: "cascade" }),
    authorName: text("author_name").notNull(),
    message: text("message").notNull(),
    color: text("color").$type<BoardColor>().notNull().default("yellow"),
    guestKeyHash: text("guest_key_hash").notNull(),
    hiddenAt: timestamp("hidden_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("board_notes_board_id_idx").on(table.boardId)],
);

export const boardReports = pgTable(
  "board_reports",
  {
    noteId: uuid("note_id")
      .notNull()
      .references(() => boardNotes.id, { onDelete: "cascade" }),
    reporterHash: text("reporter_hash").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  //one row per person per note, so reporting twice still counts once
  (table) => [primaryKey({ columns: [table.noteId, table.reporterHash] })],
);

//relational tables
export const boardsRelations = relations(boards, ({ one, many }) => ({
  owner: one(user, { fields: [boards.ownerId], references: [user.id] }),
  notes: many(boardNotes),
}));

export const boardNotesRelations = relations(boardNotes, ({ one, many }) => ({
  board: one(boards, { fields: [boardNotes.boardId], references: [boards.id] }),
  reports: many(boardReports),
}));

export const boardReportsRelations = relations(boardReports, ({ one }) => ({
  note: one(boardNotes, { fields: [boardReports.noteId], references: [boardNotes.id] }),
}));
