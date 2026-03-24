import { Schema } from "effect";

import { Student } from "../student";
import { CvProfile } from "./cv-profile";

export class PresentedCvProfilePreview extends Schema.Class<PresentedCvProfilePreview>(
  "PresentedCvProfilePreview",
)({
  student: Student,
  cvProfile: CvProfile,
  qrIdentity: Schema.String,
}) {}
