import { Schema } from "effect";

import { CompanyId } from "../company";
import { CompanyArrivalStatus, Room, Zone } from "../venue";

export class AdminInterviewLedgerCompany extends Schema.Class<AdminInterviewLedgerCompany>(
  "AdminInterviewLedgerCompany",
)({
  id: CompanyId,
  name: Schema.String,
  zone: Schema.NullOr(Zone),
  room: Schema.NullOr(Room),
  arrivalStatus: CompanyArrivalStatus,
}) {}
