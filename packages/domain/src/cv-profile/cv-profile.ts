import { Schema } from "effect";

import { StudentId } from "../student";
import { CvProfileType } from "../vocabulary";
import { CvProfileId } from "./cv-profile-id";

export class CvProfile extends Schema.Class<CvProfile>("CvProfile")({
  id: CvProfileId,
  studentId: StudentId,
  presentationCode: Schema.String,
  profileType: CvProfileType,
  fileName: Schema.String,
  contentType: Schema.String,
  fileSizeBytes: Schema.Number,
}) {}
