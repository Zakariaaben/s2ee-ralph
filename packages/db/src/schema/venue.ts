import {
  doublePrecision,
  index,
  pgTable,
  text,
  timestamp,
} from "drizzle-orm/pg-core";

export const zone = pgTable(
  "zone",
  {
    id: text("id").primaryKey(),
    code: text("code").notNull().unique(),
    label: text("label").notNull(),
    latitude: doublePrecision("latitude"),
    longitude: doublePrecision("longitude"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [index("zone_code_idx").on(table.code)],
);

export const room = pgTable(
  "room",
  {
    id: text("id").primaryKey(),
    code: text("code").notNull().unique(),
    zoneId: text("zone_id").references(() => zone.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [index("room_code_idx").on(table.code), index("room_zone_id_idx").on(table.zoneId)],
);
