import { Schema } from "effect";

import { VenueRoom } from "./venue-room";

export class VenueMapPin extends Schema.Class<VenueMapPin>("VenueMapPin")({
  room: VenueRoom,
  xPercent: Schema.Number,
  yPercent: Schema.Number,
}) {}
