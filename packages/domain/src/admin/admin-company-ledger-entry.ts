import { Schema } from "effect";

import { Company } from "../company";
import { CompanyArrivalStatus, Room } from "../venue";

export class AdminCompanyLedgerEntry extends Schema.Class<AdminCompanyLedgerEntry>(
  "AdminCompanyLedgerEntry",
)({
  company: Company,
  room: Schema.NullOr(Room),
  standNumber: Schema.NullOr(Schema.Number),
  arrivalStatus: CompanyArrivalStatus,
}) {}
