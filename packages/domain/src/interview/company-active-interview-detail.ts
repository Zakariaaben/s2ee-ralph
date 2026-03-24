import { Schema } from "effect";

import { CvProfile } from "../cv-profile";
import { Student } from "../student";
import { Interview } from "./interview";

export class CompanyActiveInterviewDetail extends Schema.Class<CompanyActiveInterviewDetail>(
  "CompanyActiveInterviewDetail",
)({
  interview: Interview,
  student: Student,
  cvProfile: CvProfile,
}) {}
