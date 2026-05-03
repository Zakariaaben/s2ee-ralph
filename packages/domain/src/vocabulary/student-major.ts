import { Schema } from "effect";

import { StudentMajorId } from "./student-major-id";

export class StudentMajor extends Schema.Class<StudentMajor>("StudentMajor")({
  id: StudentMajorId,
  label: Schema.String,
}) {}
