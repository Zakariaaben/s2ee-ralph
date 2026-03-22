import { doublePrecision, index, pgTable, text, timestamp } from "drizzle-orm/pg-core";

export const room = pgTable(
  "room",
  {
    id: text("id").primaryKey(),
    code: text("code").notNull().unique(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [index("room_code_idx").on(table.code)],
);

export const publishedVenueMap = pgTable("published_venue_map", {
  id: text("id").primaryKey(),
  fileName: text("file_name").notNull(),
  contentType: text("content_type").notNull(),
  contentsBase64: text("contents_base64").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .$onUpdate(() => /* @__PURE__ */ new Date())
    .notNull(),
});

export const publishedVenueMapPin = pgTable(
  "published_venue_map_pin",
  {
    roomId: text("room_id")
      .primaryKey()
      .references(() => room.id, { onDelete: "cascade" }),
    xPercent: doublePrecision("x_percent").notNull(),
    yPercent: doublePrecision("y_percent").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [index("published_venue_map_pin_room_id_idx").on(table.roomId)],
);
