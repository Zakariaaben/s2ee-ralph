import { CompanyArrivalStatusValues } from "@project/domain";
import { user } from "./auth";
import { room } from "./venue";
import { index, integer, pgEnum, pgTable, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";

export const companyArrivalStatus = pgEnum(
  "company_arrival_status",
  CompanyArrivalStatusValues,
);

export const company = pgTable(
  "company",
  {
    id: text("id").primaryKey(),
    ownerUserId: text("owner_user_id")
      .notNull()
      .unique()
      .references(() => user.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    roomId: text("room_id").references(() => room.id, { onDelete: "set null" }),
    standNumber: integer("stand_number"),
    arrivalStatus: companyArrivalStatus("arrival_status")
      .notNull()
      .default("not-arrived"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [
    index("company_owner_user_id_idx").on(table.ownerUserId),
    index("company_room_id_idx").on(table.roomId),
    uniqueIndex("company_room_stand_unique_idx").on(
      table.roomId,
      table.standNumber,
    ),
  ],
);

export const recruiter = pgTable(
  "recruiter",
  {
    id: text("id").primaryKey(),
    companyId: text("company_id")
      .notNull()
      .references(() => company.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [index("recruiter_company_id_idx").on(table.companyId)],
);
