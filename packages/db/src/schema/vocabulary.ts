import { index, integer, pgTable, text, timestamp } from "drizzle-orm/pg-core";

export const cvProfileType = pgTable(
  "cv_profile_type",
  {
    id: text("id").primaryKey(),
    label: text("label").notNull(),
    sortOrder: integer("sort_order").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [index("cv_profile_type_sort_order_idx").on(table.sortOrder)],
);

export const globalInterviewTag = pgTable(
  "global_interview_tag",
  {
    id: text("id").primaryKey(),
    label: text("label").notNull(),
    sortOrder: integer("sort_order").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [index("global_interview_tag_sort_order_idx").on(table.sortOrder)],
);
