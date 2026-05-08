import { Schema } from "effect";

import { Room } from "./room";
import { VenueCompany } from "./venue-company";

export class VenueRoom extends Schema.Class<VenueRoom>("VenueRoom")({
  id: Room.fields.id,
  code: Room.fields.code,
  zone: Room.fields.zone,
  companies: Schema.Array(VenueCompany),
}) {}
