import { Schema } from "effect";

export class VenueMapImage extends Schema.Class<VenueMapImage>("VenueMapImage")({
  fileName: Schema.String,
  contentType: Schema.String,
  contentsBase64: Schema.String,
}) {}
