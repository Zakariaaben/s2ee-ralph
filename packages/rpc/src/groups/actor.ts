import { AuthenticatedActor } from "@project/domain";
import { Schema } from "effect";
import * as HttpApiError from "effect/unstable/httpapi/HttpApiError";
import { Rpc, RpcGroup } from "effect/unstable/rpc";

import { CurrentActorRpcMiddleware } from "../middleware/current-actor";

export const RoleProtectedRpcError = Schema.Union([
  HttpApiError.Unauthorized,
  HttpApiError.Forbidden,
]);

export const ActorRpcGroup = RpcGroup.make(
  Rpc.make("currentActor", {
    success: AuthenticatedActor,
    error: HttpApiError.Unauthorized,
  }),
  Rpc.make("requireAdminAccess", {
    success: AuthenticatedActor,
    error: RoleProtectedRpcError,
  }),
  Rpc.make("requireStudentAccess", {
    success: AuthenticatedActor,
    error: RoleProtectedRpcError,
  }),
  Rpc.make("requireCompanyAccess", {
    success: AuthenticatedActor,
    error: RoleProtectedRpcError,
  }),
  Rpc.make("requireCheckInAccess", {
    success: AuthenticatedActor,
    error: RoleProtectedRpcError,
  }),
).middleware(CurrentActorRpcMiddleware);
