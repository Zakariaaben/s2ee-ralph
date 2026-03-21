import { Schema } from "effect";

import { CvProfileTypeId } from "./cv-profile-type-id";

export class CvProfileType extends Schema.Class<CvProfileType>("CvProfileType")({
  id: CvProfileTypeId,
  label: Schema.String,
}) {}
