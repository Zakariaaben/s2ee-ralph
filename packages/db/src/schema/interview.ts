import { InterviewStatusValues } from "@project/domain";
import {
  doublePrecision,
  index,
  integer,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

import { company } from "./company";
import { cvProfile } from "./cv-profile";
import { student } from "./student";

export const interviewStatus = pgEnum("interview_status", InterviewStatusValues);

export const companyInterviewTag = pgTable(
  "company_interview_tag",
  {
    id: text("id").primaryKey(),
    companyId: text("company_id")
      .notNull()
      .references(() => company.id, { onDelete: "cascade" }),
    label: text("label").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [
    index("company_interview_tag_company_id_idx").on(table.companyId),
    uniqueIndex("company_interview_tag_company_label_unique_idx").on(
      table.companyId,
      table.label,
    ),
  ],
);

export const interview = pgTable(
  "interview",
  {
    id: text("id").primaryKey(),
    companyId: text("company_id")
      .notNull()
      .references(() => company.id, { onDelete: "cascade" }),
    studentId: text("student_id")
      .notNull()
      .references(() => student.id, { onDelete: "cascade" }),
    cvProfileId: text("cv_profile_id")
      .notNull()
      .references(() => cvProfile.id),
    recruiterName: text("recruiter_name").notNull(),
    status: interviewStatus("status").notNull(),
    score: doublePrecision("score"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("interview_company_id_idx").on(table.companyId),
    index("interview_student_id_idx").on(table.studentId),
    index("interview_cv_profile_id_idx").on(table.cvProfileId),
    index("interview_status_idx").on(table.status),
  ],
);

export const interviewGlobalTag = pgTable(
  "interview_global_tag",
  {
    interviewId: text("interview_id")
      .notNull()
      .references(() => interview.id, { onDelete: "cascade" }),
    globalTagId: text("global_tag_id").notNull(),
    globalTagLabel: text("global_tag_label").notNull(),
    sortOrder: integer("sort_order").notNull(),
  },
  (table) => [
    primaryKey({
      columns: [table.interviewId, table.globalTagId],
    }),
    index("interview_global_tag_interview_id_idx").on(table.interviewId),
  ],
);

export const interviewCompanyTag = pgTable(
  "interview_company_tag",
  {
    interviewId: text("interview_id")
      .notNull()
      .references(() => interview.id, { onDelete: "cascade" }),
    companyTagId: text("company_tag_id").notNull(),
    companyTagLabel: text("company_tag_label").notNull(),
    sortOrder: integer("sort_order").notNull(),
  },
  (table) => [
    primaryKey({
      columns: [table.interviewId, table.companyTagId],
    }),
    index("interview_company_tag_interview_id_idx").on(table.interviewId),
  ],
);
