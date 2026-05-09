import { Schema } from "effect";

export class FeaturedCompany extends Schema.Class<FeaturedCompany>("FeaturedCompany")({
  id: Schema.String,
  name: Schema.String,
  description: Schema.String,
  logoLabel: Schema.String,
  profiles: Schema.Array(Schema.String),
  employmentCount: Schema.Number,
  workerInternshipCount: Schema.Number,
  practicalInternshipCount: Schema.Number,
  pfeCount: Schema.Number,
  sortOrder: Schema.Number,
  isPublished: Schema.Boolean,
}) {}
