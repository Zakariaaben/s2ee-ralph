import { Schema } from "effect";

import { Timestamp } from "./timestamps";

export class HealthStatus extends Schema.Class<HealthStatus>("HealthStatus")({
  status: Schema.Literal("ok"),
  timestamp: Timestamp,
}) {}
