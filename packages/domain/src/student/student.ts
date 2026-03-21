import { Schema } from "effect";

import { StudentId } from "./student-id";

export class Student extends Schema.Class<Student>("Student")({
  id: StudentId,
  firstName: Schema.String,
  lastName: Schema.String,
  course: Schema.String,
}) {}
