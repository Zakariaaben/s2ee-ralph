import { Schema } from "effect";

import { CvProfileType } from "./cv-profile-type";
import { GlobalInterviewTag } from "./global-interview-tag";
import { StudentInstitution } from "./student-institution";
import { StudentMajor } from "./student-major";

export class ControlledVocabularies extends Schema.Class<ControlledVocabularies>(
  "ControlledVocabularies",
)({
  cvProfileTypes: Schema.Array(CvProfileType),
  globalInterviewTags: Schema.Array(GlobalInterviewTag),
  studentInstitutions: Schema.Array(StudentInstitution),
  studentMajors: Schema.Array(StudentMajor),
}) {}
