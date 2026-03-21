import { Schema } from "effect";

import { CvProfileId } from "./cv-profile-id";

export class CvProfileFile extends Schema.Class<CvProfileFile>("CvProfileFile")({
  cvProfileId: CvProfileId,
  fileName: Schema.String,
  contentType: Schema.String,
  contentsBase64: Schema.String,
}) {}
