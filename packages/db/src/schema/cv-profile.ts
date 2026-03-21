import { index, integer, pgTable, text, timestamp } from "drizzle-orm/pg-core";

import { student } from "./student";

export const cvProfile = pgTable(
  "cv_profile",
  {
    id: text("id").primaryKey(),
    studentId: text("student_id")
      .notNull()
      .references(() => student.id, { onDelete: "cascade" }),
    profileTypeId: text("profile_type_id").notNull(),
    profileTypeLabel: text("profile_type_label").notNull(),
    fileName: text("file_name").notNull(),
    contentType: text("content_type").notNull(),
    fileSizeBytes: integer("file_size_bytes").notNull(),
    storageKey: text("storage_key").notNull().unique(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("cv_profile_student_id_idx").on(table.studentId),
    index("cv_profile_profile_type_id_idx").on(table.profileTypeId),
  ],
);
