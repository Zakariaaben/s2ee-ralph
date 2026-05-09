import {
  AdminAccessLedgerEntry,
  AdminCompanyLedgerEntry,
  AdminInterviewLedgerEntry,
  FeaturedCompany,
  UserId,
  UserRole,
} from "@project/domain";
import { Schema } from "effect";
import * as HttpApiError from "effect/unstable/httpapi/HttpApiError";
import { Rpc, RpcGroup } from "effect/unstable/rpc";

import { CurrentActorRpcMiddleware } from "../middleware/current-actor";
import { RequiredText } from "../request-schemas";

export const AdminRpcAccessError = Schema.Union([
  HttpApiError.Unauthorized,
  HttpApiError.Forbidden,
]);

export class ChangeAdminUserRoleInput extends Schema.Class<ChangeAdminUserRoleInput>(
  "ChangeAdminUserRoleInput",
)({
  userId: UserId,
  role: UserRole,
}) {}

export class CreateAdminCompanyAccountInput extends Schema.Class<CreateAdminCompanyAccountInput>(
  "CreateAdminCompanyAccountInput",
)({
  companyName: RequiredText,
  email: RequiredText,
  password: RequiredText,
}) {}

const NonNegativeInteger = Schema.Number.check(Schema.isInt()).pipe(
  Schema.check(Schema.isGreaterThanOrEqualTo(0)),
);

export class UpsertFeaturedCompanyInput extends Schema.Class<UpsertFeaturedCompanyInput>(
  "UpsertFeaturedCompanyInput",
)({
  id: Schema.NullOr(Schema.String),
  name: RequiredText,
  description: Schema.Trim,
  logoLabel: Schema.Trim,
  profiles: Schema.Array(Schema.Trim),
  employmentCount: NonNegativeInteger,
  workerInternshipCount: NonNegativeInteger,
  practicalInternshipCount: NonNegativeInteger,
  pfeCount: NonNegativeInteger,
  sortOrder: NonNegativeInteger,
  isPublished: Schema.Boolean,
}) {}

export class DeleteFeaturedCompanyInput extends Schema.Class<DeleteFeaturedCompanyInput>(
  "DeleteFeaturedCompanyInput",
)({
  id: Schema.String,
}) {}

export const AdminRpcGroup = RpcGroup.make(
  Rpc.make("listAdminCompanyLedger", {
    success: Schema.Array(AdminCompanyLedgerEntry),
    error: AdminRpcAccessError,
  }),
  Rpc.make("listAdminInterviewLedger", {
    success: Schema.Array(AdminInterviewLedgerEntry),
    error: AdminRpcAccessError,
  }),
  Rpc.make("listAdminAccessLedger", {
    success: Schema.Array(AdminAccessLedgerEntry),
    error: AdminRpcAccessError,
  }),
  Rpc.make("listAdminFeaturedCompanies", {
    success: Schema.Array(FeaturedCompany),
    error: AdminRpcAccessError,
  }),
  Rpc.make("upsertFeaturedCompany", {
    success: FeaturedCompany,
    error: Schema.Union([AdminRpcAccessError, HttpApiError.BadRequest]),
    payload: UpsertFeaturedCompanyInput,
  }),
  Rpc.make("deleteFeaturedCompany", {
    success: Schema.Void,
    error: Schema.Union([AdminRpcAccessError, HttpApiError.NotFound]),
    payload: DeleteFeaturedCompanyInput,
  }),
  Rpc.make("changeAdminUserRole", {
    success: AdminAccessLedgerEntry,
    error: Schema.Union([AdminRpcAccessError, HttpApiError.NotFound]),
    payload: ChangeAdminUserRoleInput,
  }),
  Rpc.make("createAdminCompanyAccount", {
    success: AdminAccessLedgerEntry,
    error: Schema.Union([AdminRpcAccessError, HttpApiError.BadRequest]),
    payload: CreateAdminCompanyAccountInput,
  }),
).middleware(CurrentActorRpcMiddleware);

export const PublicFeaturedCompanyRpcGroup = RpcGroup.make(
  Rpc.make("listFeaturedCompanies", {
    success: Schema.Array(FeaturedCompany),
  }),
);
