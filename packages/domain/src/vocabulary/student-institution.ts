import { Schema } from "effect";

import { StudentInstitutionId } from "./student-institution-id";

export class StudentInstitution extends Schema.Class<StudentInstitution>("StudentInstitution")({
  id: StudentInstitutionId,
  label: Schema.String,
}) {}
