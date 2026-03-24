import { Schema } from "effect";

import { StudentId } from "./student-id";

export class Student extends Schema.Class<Student>("Student")({
  id: StudentId,
  firstName: Schema.String,
  lastName: Schema.String,
  phoneNumber: Schema.String,
  academicYear: Schema.String,
  major: Schema.String,
  institution: Schema.String,
  image: Schema.NullOr(Schema.String),
}) {}
