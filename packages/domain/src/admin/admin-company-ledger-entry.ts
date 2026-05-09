import { Schema } from "effect";

import { Company } from "../company";
import { CompanyArrivalStatus, Room, Zone } from "../venue";

export class AdminCompanyLedgerEntry extends Schema.Class<AdminCompanyLedgerEntry>(
  "AdminCompanyLedgerEntry",
)({
  company: Company,
  zone: Schema.NullOr(Zone),
  room: Schema.NullOr(Room),
  arrivalStatus: CompanyArrivalStatus,
}) {}
