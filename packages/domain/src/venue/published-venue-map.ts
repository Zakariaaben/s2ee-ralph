import { Schema } from "effect";

import { VenueMapImage } from "./venue-map-image";
import { VenueMapPin } from "./venue-map-pin";

export class PublishedVenueMap extends Schema.Class<PublishedVenueMap>("PublishedVenueMap")({
  image: VenueMapImage,
  pins: Schema.Array(VenueMapPin),
}) {}
