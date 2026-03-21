import { Schema } from "effect";

import { CompanyId } from "./company-id";
import { Recruiter } from "./recruiter";

export class Company extends Schema.Class<Company>("Company")({
  id: CompanyId,
  name: Schema.String,
  recruiters: Schema.Array(Recruiter),
}) {}
