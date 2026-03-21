import { Schema } from "effect";

import { Timestamp } from "./timestamps";

export class HealthChecks extends Schema.Class<HealthChecks>("HealthChecks")({
  database: Schema.Literal("ok"),
  storage: Schema.Literal("ok"),
}) {}

export class HealthStatus extends Schema.Class<HealthStatus>("HealthStatus")({
  status: Schema.Literal("ok"),
  timestamp: Timestamp,
  checks: HealthChecks,
}) {}
