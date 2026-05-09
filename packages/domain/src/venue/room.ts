import { Schema } from "effect";

import { RoomId } from "./room-id";
import { Zone } from "./zone";

export class Room extends Schema.Class<Room>("Room")({
  id: RoomId,
  code: Schema.String,
  zone: Schema.NullOr(Zone),
}) {}
