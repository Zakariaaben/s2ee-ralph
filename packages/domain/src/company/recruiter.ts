import { Schema } from "effect";

import { RecruiterId } from "./recruiter-id";

export class Recruiter extends Schema.Class<Recruiter>("Recruiter")({
  id: RecruiterId,
  name: Schema.String,
}) {}
