import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const metronomeRooms = sqliteTable("metronome_rooms", {
  code: text("code").primaryKey(),
  bpm: integer("bpm").notNull().default(80),
  running: integer("running", { mode: "boolean" }).notNull().default(false),
  updatedAt: integer("updated_at").notNull(),
});
