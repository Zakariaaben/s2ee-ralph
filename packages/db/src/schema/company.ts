import { CompanyArrivalStatusValues } from "@project/domain";
import { user } from "./auth";
import { room, zone } from "./venue";
import { boolean, index, integer, jsonb, pgEnum, pgTable, text, timestamp } from "drizzle-orm/pg-core";

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
    logoUrl: text("logo_url"),
    zoneId: text("zone_id").references(() => zone.id, { onDelete: "set null" }),
    roomId: text("room_id").references(() => room.id, { onDelete: "set null" }),
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
    index("company_zone_id_idx").on(table.zoneId),
    index("company_room_id_idx").on(table.roomId),
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

export const featuredCompany = pgTable(
  "featured_company",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    description: text("description").notNull().default(""),
    logoLabel: text("logo_label").notNull().default(""),
    profiles: jsonb("profiles").$type<Array<string>>().notNull().default([]),
    employmentCount: integer("employment_count").notNull().default(0),
    workerInternshipCount: integer("worker_internship_count").notNull().default(0),
    practicalInternshipCount: integer("practical_internship_count").notNull().default(0),
    pfeCount: integer("pfe_count").notNull().default(0),
    sortOrder: integer("sort_order").notNull().default(0),
    isPublished: boolean("is_published").notNull().default(true),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [
    index("featured_company_published_sort_idx").on(table.isPublished, table.sortOrder),
    index("featured_company_name_idx").on(table.name),
  ],
);
