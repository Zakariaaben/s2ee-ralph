import { Schema } from "effect";

import { CvProfileType } from "./cv-profile-type";
import { GlobalInterviewTag } from "./global-interview-tag";

export class ControlledVocabularies extends Schema.Class<ControlledVocabularies>(
  "ControlledVocabularies",
)({
  cvProfileTypes: Schema.Array(CvProfileType),
  globalInterviewTags: Schema.Array(GlobalInterviewTag),
}) {}
