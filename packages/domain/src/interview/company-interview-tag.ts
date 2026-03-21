import { Schema } from "effect";

import { CompanyInterviewTagId } from "./company-interview-tag-id";

export class CompanyInterviewTag extends Schema.Class<CompanyInterviewTag>(
  "CompanyInterviewTag",
)({
  id: CompanyInterviewTagId,
  label: Schema.String,
}) {}
