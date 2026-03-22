import { Schema } from "effect";

import { Company } from "../company";
import { Student } from "../student";
import { User } from "../user";

export class AdminAccessLedgerEntry extends Schema.Class<AdminAccessLedgerEntry>(
  "AdminAccessLedgerEntry",
)({
  user: User,
  student: Schema.NullOr(Student),
  company: Schema.NullOr(Company),
}) {}
