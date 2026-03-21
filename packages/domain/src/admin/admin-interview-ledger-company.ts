import { Schema } from "effect";

import { CompanyId } from "../company";
import { CompanyArrivalStatus, Room } from "../venue";

export class AdminInterviewLedgerCompany extends Schema.Class<AdminInterviewLedgerCompany>(
  "AdminInterviewLedgerCompany",
)({
  id: CompanyId,
  name: Schema.String,
  room: Schema.NullOr(Room),
  standNumber: Schema.NullOr(Schema.Number),
  arrivalStatus: CompanyArrivalStatus,
}) {}
