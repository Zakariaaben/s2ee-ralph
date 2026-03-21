import { Schema } from "effect";

import { CvProfile } from "../cv-profile";
import { Student } from "../student";
import { Interview } from "./interview";

export class CompanyCompletedInterviewLedgerEntry extends Schema.Class<CompanyCompletedInterviewLedgerEntry>(
  "CompanyCompletedInterviewLedgerEntry",
)({
  interview: Interview,
  student: Student,
  cvProfile: CvProfile,
}) {}
