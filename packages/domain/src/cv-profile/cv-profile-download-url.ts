import { Schema } from "effect";

import { CvProfileId } from "./cv-profile-id";

export class CvProfileDownloadUrl extends Schema.Class<CvProfileDownloadUrl>("CvProfileDownloadUrl")({
  cvProfileId: CvProfileId,
  fileName: Schema.String,
  url: Schema.String,
}) {}
