import { Schema } from "effect";

import { RoomId } from "./room-id";

export class Room extends Schema.Class<Room>("Room")({
  id: RoomId,
  code: Schema.String,
}) {}
