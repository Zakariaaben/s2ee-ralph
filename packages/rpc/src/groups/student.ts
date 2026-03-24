import { Student } from "@project/domain";
import { Schema } from "effect";
import * as HttpApiError from "effect/unstable/httpapi/HttpApiError";
import { Rpc, RpcGroup } from "effect/unstable/rpc";

import { CurrentActorRpcMiddleware } from "../middleware/current-actor";
import { RequiredText, StudentQrIdentity } from "../request-schemas";

export class UpsertStudentOnboardingInput extends Schema.Class<UpsertStudentOnboardingInput>(
  "UpsertStudentOnboardingInput",
)({
  firstName: RequiredText,
  lastName: RequiredText,
  phoneNumber: RequiredText,
  academicYear: RequiredText,
  major: RequiredText,
  institution: RequiredText,
  image: Schema.NullOr(RequiredText),
}) {}

export class ResolveStudentQrIdentityInput extends Schema.Class<ResolveStudentQrIdentityInput>(
  "ResolveStudentQrIdentityInput",
)({
  qrIdentity: StudentQrIdentity,
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
