import { Schema } from "effect";

import { CvProfile } from "../cv-profile";
import { Interview } from "../interview";
import { Student } from "../student";
import { AdminInterviewLedgerCompany } from "./admin-interview-ledger-company";

export class AdminInterviewLedgerEntry extends Schema.Class<AdminInterviewLedgerEntry>(
  "AdminInterviewLedgerEntry",
)({
  interview: Interview,
  company: AdminInterviewLedgerCompany,
  student: Student,
  cvProfile: CvProfile,
}) {}
