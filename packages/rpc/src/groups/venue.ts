import { PublishedVenueMap, Room, RoomId, VenueCompany, VenueRoom } from "@project/domain";
import { Schema } from "effect";
import * as HttpApiError from "effect/unstable/httpapi/HttpApiError";
import { Rpc, RpcGroup } from "effect/unstable/rpc";

import { CurrentActorRpcMiddleware } from "../middleware/current-actor";
import {
  Base64FileContents,
  CoordinatePercentage,
  ImageContentType,
  PositiveInteger,
  RequiredText,
  RoomCode,
} from "../request-schemas";

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

export class UpdateRoomInput extends Schema.Class<UpdateRoomInput>(
  "UpdateRoomInput",
)({
  roomId: RoomId,
  code: RoomCode,
}) {}

export class DeleteRoomInput extends Schema.Class<DeleteRoomInput>(
  "DeleteRoomInput",
)({
  roomId: RoomId,
}) {}

export class ClearCompanyPlacementInput extends Schema.Class<ClearCompanyPlacementInput>(
  "ClearCompanyPlacementInput",
)({
  companyId: Schema.String,
}) {}

export class MarkCompanyArrivedInput extends Schema.Class<MarkCompanyArrivedInput>(
  "MarkCompanyArrivedInput",
)({
  companyId: Schema.String,
}) {}

export class PublishVenueMapInput extends Schema.Class<PublishVenueMapInput>(
  "PublishVenueMapInput",
)({
  fileName: RequiredText,
  contentType: ImageContentType,
  contentsBase64: Base64FileContents,
}) {}

export class UpsertVenueMapRoomPinInput extends Schema.Class<UpsertVenueMapRoomPinInput>(
  "UpsertVenueMapRoomPinInput",
)({
  roomId: RoomId,
  xPercent: CoordinatePercentage,
  yPercent: CoordinatePercentage,
}) {}

export class DeleteVenueMapRoomPinInput extends Schema.Class<DeleteVenueMapRoomPinInput>(
  "DeleteVenueMapRoomPinInput",
)({
  roomId: RoomId,
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
  Rpc.make("publishVenueMap", {
    success: PublishedVenueMap,
    error: Schema.Union([VenueRpcAccessError, HttpApiError.BadRequest]),
    payload: PublishVenueMapInput,
  }),
  Rpc.make("clearPublishedVenueMap", {
    success: Schema.Void,
    error: VenueRpcAccessError,
  }),
  Rpc.make("upsertVenueMapRoomPin", {
    success: PublishedVenueMap,
    error: VenueRpcMutationError,
    payload: UpsertVenueMapRoomPinInput,
  }),
  Rpc.make("deleteVenueMapRoomPin", {
    success: Schema.Void,
    error: Schema.Union([VenueRpcAccessError, HttpApiError.NotFound]),
    payload: DeleteVenueMapRoomPinInput,
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
  Rpc.make("assignCompanyPlacement", {
    success: VenueCompany,
    error: VenueRpcMutationError,
    payload: AssignCompanyPlacementInput,
  }),
  Rpc.make("clearCompanyPlacement", {
    success: Schema.Void,
    error: Schema.Union([VenueRpcAccessError, HttpApiError.NotFound]),
    payload: ClearCompanyPlacementInput,
  }),
  Rpc.make("markCompanyArrived", {
    success: VenueCompany,
    error: Schema.Union([VenueRpcAccessError, HttpApiError.NotFound]),
    payload: MarkCompanyArrivedInput,
  }),
).middleware(CurrentActorRpcMiddleware);

export const PublicVenueRpcGroup = RpcGroup.make(
  Rpc.make("getPublishedVenueMap", {
    success: Schema.NullOr(PublishedVenueMap),
  }),
);
