import { Schema } from "effect";

import { ZoneId } from "./zone-id";

export class Zone extends Schema.Class<Zone>("Zone")({
  id: ZoneId,
  code: Schema.String,
  label: Schema.String,
  latitude: Schema.NullOr(Schema.Number),
  longitude: Schema.NullOr(Schema.Number),
}) {}
