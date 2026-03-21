import { Schema } from "effect";

import { GlobalInterviewTagId } from "./global-interview-tag-id";

export class GlobalInterviewTag extends Schema.Class<GlobalInterviewTag>(
  "GlobalInterviewTag",
)({
  id: GlobalInterviewTagId,
  label: Schema.String,
}) {}
