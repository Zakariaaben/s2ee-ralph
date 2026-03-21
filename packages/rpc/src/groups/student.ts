import { Student } from "@project/domain";
import { Schema } from "effect";
import * as HttpApiError from "effect/unstable/httpapi/HttpApiError";
import { Rpc, RpcGroup } from "effect/unstable/rpc";

import { CurrentActorRpcMiddleware } from "../middleware/current-actor";

export class UpsertStudentOnboardingInput extends Schema.Class<UpsertStudentOnboardingInput>(
  "UpsertStudentOnboardingInput",
)({
  firstName: Schema.String,
  lastName: Schema.String,
  course: Schema.String,
}) {}

export class ResolveStudentQrIdentityInput extends Schema.Class<ResolveStudentQrIdentityInput>(
  "ResolveStudentQrIdentityInput",
)({
  qrIdentity: Schema.String,
}) {}

export const StudentRpcAccessError = Schema.Union([
  HttpApiError.Unauthorized,
  HttpApiError.Forbidden,
]);

export const StudentRpcMutationError = Schema.Union([
  HttpApiError.Unauthorized,
  HttpApiError.Forbidden,
  HttpApiError.BadRequest,
  HttpApiError.NotFound,
]);

export const StudentRpcGroup = RpcGroup.make(
  Rpc.make("currentStudent", {
    success: Schema.NullOr(Student),
    error: StudentRpcAccessError,
  }),
  Rpc.make("upsertStudentOnboarding", {
    success: Student,
    error: Schema.Union([StudentRpcAccessError, HttpApiError.BadRequest]),
    payload: UpsertStudentOnboardingInput,
  }),
  Rpc.make("issueStudentQrIdentity", {
    success: Schema.String,
    error: Schema.Union([StudentRpcAccessError, HttpApiError.NotFound]),
  }),
  Rpc.make("resolveStudentQrIdentity", {
    success: Student,
    error: StudentRpcMutationError,
    payload: ResolveStudentQrIdentityInput,
  }),
).middleware(CurrentActorRpcMiddleware);
