import { Company, RecruiterId } from "@project/domain";
import { Schema } from "effect";
import * as HttpApiError from "effect/unstable/httpapi/HttpApiError";
import { Rpc, RpcGroup } from "effect/unstable/rpc";

import { CurrentActorRpcMiddleware } from "../middleware/current-actor";

export class UpsertCompanyProfileInput extends Schema.Class<UpsertCompanyProfileInput>(
  "UpsertCompanyProfileInput",
)({
  name: Schema.String,
}) {}

export class AddRecruiterInput extends Schema.Class<AddRecruiterInput>(
  "AddRecruiterInput",
)({
  name: Schema.String,
}) {}

export class RenameRecruiterInput extends Schema.Class<RenameRecruiterInput>(
  "RenameRecruiterInput",
)({
  recruiterId: RecruiterId,
  name: Schema.String,
}) {}

export const CompanyRpcAccessError = Schema.Union([
  HttpApiError.Unauthorized,
  HttpApiError.Forbidden,
]);

export const CompanyRpcMutationError = Schema.Union([
  HttpApiError.Unauthorized,
  HttpApiError.Forbidden,
  HttpApiError.BadRequest,
  HttpApiError.NotFound,
]);

export const CompanyRpcGroup = RpcGroup.make(
  Rpc.make("currentCompany", {
    success: Schema.NullOr(Company),
    error: CompanyRpcAccessError,
  }),
  Rpc.make("upsertCompanyProfile", {
    success: Company,
    error: Schema.Union([CompanyRpcAccessError, HttpApiError.BadRequest]),
    payload: UpsertCompanyProfileInput,
  }),
  Rpc.make("addRecruiter", {
    success: Company,
    error: CompanyRpcMutationError,
    payload: AddRecruiterInput,
  }),
  Rpc.make("renameRecruiter", {
    success: Company,
    error: CompanyRpcMutationError,
    payload: RenameRecruiterInput,
  }),
).middleware(CurrentActorRpcMiddleware);
