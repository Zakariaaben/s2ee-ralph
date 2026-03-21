import { Schema } from "effect";

import { CompanyId } from "../company";
import { CompanyArrivalStatus } from "./company-arrival-status";

export class VenueCompany extends Schema.Class<VenueCompany>("VenueCompany")({
  companyId: CompanyId,
  companyName: Schema.String,
  standNumber: Schema.Number,
  arrivalStatus: CompanyArrivalStatus,
}) {}
