import { Room, RoomId, VenueCompany, VenueRoom } from "@project/domain";
import { Schema } from "effect";
import * as HttpApiError from "effect/unstable/httpapi/HttpApiError";
import { Rpc, RpcGroup } from "effect/unstable/rpc";

import { CurrentActorRpcMiddleware } from "../middleware/current-actor";
import { PositiveInteger, RoomCode } from "../request-schemas";

export class CreateRoomInput extends Schema.Class<CreateRoomInput>(
  "CreateRoomInput",
)({
  code: RoomCode,
}) {}

export class AssignCompanyPlacementInput extends Schema.Class<AssignCompanyPlacementInput>(
  "AssignCompanyPlacementInput",
)({
  companyId: Schema.String,
  roomId: RoomId,
  standNumber: PositiveInteger,
}) {}

export class MarkCompanyArrivedInput extends Schema.Class<MarkCompanyArrivedInput>(
  "MarkCompanyArrivedInput",
)({
  companyId: Schema.String,
}) {}

export const VenueRpcAccessError = Schema.Union([
  HttpApiError.Unauthorized,
  HttpApiError.Forbidden,
]);

export const VenueRpcMutationError = Schema.Union([
  VenueRpcAccessError,
  HttpApiError.BadRequest,
  HttpApiError.NotFound,
]);

export const VenueRpcGroup = RpcGroup.make(
  Rpc.make("listVenueRooms", {
    success: Schema.Array(VenueRoom),
    error: VenueRpcAccessError,
  }),
  Rpc.make("createRoom", {
    success: Room,
    error: Schema.Union([VenueRpcAccessError, HttpApiError.BadRequest]),
    payload: CreateRoomInput,
  }),
  Rpc.make("assignCompanyPlacement", {
    success: VenueCompany,
    error: VenueRpcMutationError,
    payload: AssignCompanyPlacementInput,
  }),
  Rpc.make("markCompanyArrived", {
    success: VenueCompany,
    error: Schema.Union([VenueRpcAccessError, HttpApiError.NotFound]),
    payload: MarkCompanyArrivedInput,
  }),
).middleware(CurrentActorRpcMiddleware);
