import { AdminCompanyLedgerEntry, Room, RoomId, VenueCompany, VenueRoom, Zone, ZoneId } from "@project/domain";
import { Schema } from "effect";
import * as HttpApiError from "effect/unstable/httpapi/HttpApiError";
import { Rpc, RpcGroup } from "effect/unstable/rpc";

import { CurrentActorRpcMiddleware } from "../middleware/current-actor";
import { RoomCode } from "../request-schemas";

export class CreateRoomInput extends Schema.Class<CreateRoomInput>(
  "CreateRoomInput",
)({
  code: RoomCode,
  zoneId: Schema.optional(ZoneId),
}) {}

export class UpdateRoomInput extends Schema.Class<UpdateRoomInput>(
  "UpdateRoomInput",
)({
  roomId: RoomId,
  code: RoomCode,
  zoneId: Schema.optional(ZoneId),
}) {}

export class DeleteRoomInput extends Schema.Class<DeleteRoomInput>(
  "DeleteRoomInput",
)({
  roomId: RoomId,
}) {}

export class MarkCompanyArrivedInput extends Schema.Class<MarkCompanyArrivedInput>(
  "MarkCompanyArrivedInput",
)({
  companyId: Schema.String,
}) {}

export class ResetCompanyArrivalInput extends Schema.Class<ResetCompanyArrivalInput>(
  "ResetCompanyArrivalInput",
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
  Rpc.make("updateRoom", {
    success: Room,
    error: VenueRpcMutationError,
    payload: UpdateRoomInput,
  }),
  Rpc.make("deleteRoom", {
    success: Room,
    error: Schema.Union([VenueRpcAccessError, HttpApiError.NotFound]),
    payload: DeleteRoomInput,
  }),
  Rpc.make("markCompanyArrived", {
    success: VenueCompany,
    error: Schema.Union([VenueRpcAccessError, HttpApiError.NotFound]),
    payload: MarkCompanyArrivedInput,
  }),
  Rpc.make("resetCompanyArrival", {
    success: VenueCompany,
    error: Schema.Union([VenueRpcAccessError, HttpApiError.NotFound]),
    payload: ResetCompanyArrivalInput,
  }),
).middleware(CurrentActorRpcMiddleware);

export const PublicVenueRpcGroup = RpcGroup.make(
  Rpc.make("listPublicVenueZones", {
    success: Schema.Array(Zone),
  }),
  Rpc.make("listPublicVenueCompanies", {
    success: Schema.Array(AdminCompanyLedgerEntry),
  }),
);
