import { index, pgTable, text, timestamp } from "drizzle-orm/pg-core";

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
