import { index, integer, primaryKey, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const users = sqliteTable("users", {
  id: text("id").primaryKey(),
  username: text("username").notNull().unique(),
  displayName: text("display_name").notNull(),
  passwordHash: text("password_hash").notNull(),
  passwordSalt: text("password_salt").notNull(),
  createdAt: integer("created_at").notNull(),
});

export const userSessions = sqliteTable("user_sessions", {
  tokenHash: text("token_hash").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  expiresAt: integer("expires_at").notNull(),
  createdAt: integer("created_at").notNull(),
}, (table) => [
  index("idx_user_sessions_user_id").on(table.userId),
  index("idx_user_sessions_expires_at").on(table.expiresAt),
]);

export const lickProgress = sqliteTable("lick_progress", {
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  lickId: text("lick_id").notNull(),
  favorite: integer("favorite", { mode: "boolean" }).notNull().default(false),
  mastered: integer("mastered", { mode: "boolean" }).notNull().default(false),
  updatedAt: integer("updated_at").notNull(),
}, (table) => [
  primaryKey({ columns: [table.userId, table.lickId] }),
  index("idx_lick_progress_user_id").on(table.userId),
]);

export const metronomeRooms = sqliteTable("metronome_rooms", {
  code: text("code").primaryKey(),
  bpm: integer("bpm").notNull().default(80),
  running: integer("running", { mode: "boolean" }).notNull().default(false),
  updatedAt: integer("updated_at").notNull(),
});
