import {
  AdminAccessLedgerEntry,
  AdminCompanyLedgerEntry,
  AdminInterviewLedgerEntry,
  CompanyId,
  FeaturedCompany,
  UserId,
  UserRole,
  Zone,
  ZoneId,
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
  logoUrl: Schema.optional(Schema.String),
  zoneCode: Schema.optional(Schema.String),
  roomCode: Schema.optional(Schema.String),
}) {}

export class UpdateAdminCompanyInput extends Schema.Class<UpdateAdminCompanyInput>(
  "UpdateAdminCompanyInput",
)({
  companyId: CompanyId,
  name: Schema.optional(Schema.String),
  email: Schema.optional(Schema.String),
  password: Schema.optional(Schema.String),
  logoUrl: Schema.optional(Schema.String),
  zoneCode: Schema.optional(Schema.String),
  roomCode: Schema.optional(Schema.String),
}) {}

export class DeleteAdminCompanyInput extends Schema.Class<DeleteAdminCompanyInput>(
  "DeleteAdminCompanyInput",
)({
  companyId: CompanyId,
}) {}

export class CreateAdminZoneInput extends Schema.Class<CreateAdminZoneInput>(
  "CreateAdminZoneInput",
)({
  code: RequiredText,
  label: RequiredText,
  latitude: Schema.optional(Schema.Number),
  longitude: Schema.optional(Schema.Number),
}) {}

export class UpdateAdminZoneInput extends Schema.Class<UpdateAdminZoneInput>(
  "UpdateAdminZoneInput",
)({
  zoneId: ZoneId,
  code: RequiredText,
  label: RequiredText,
  latitude: Schema.optional(Schema.Number),
  longitude: Schema.optional(Schema.Number),
}) {}

export class DeleteAdminZoneInput extends Schema.Class<DeleteAdminZoneInput>(
  "DeleteAdminZoneInput",
)({
  zoneId: ZoneId,
}) {}

export class ImportAdminCompaniesCsvInput extends Schema.Class<ImportAdminCompaniesCsvInput>(
  "ImportAdminCompaniesCsvInput",
)({
  csvContents: RequiredText,
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
  Rpc.make("listAdminZones", {
    success: Schema.Array(Zone),
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
    error: Schema.Union([AdminRpcAccessError, HttpApiError.NotFound, HttpApiError.BadRequest]),
    payload: ChangeAdminUserRoleInput,
  }),
  Rpc.make("createAdminCompanyAccount", {
    success: AdminAccessLedgerEntry,
    error: Schema.Union([AdminRpcAccessError, HttpApiError.BadRequest]),
    payload: CreateAdminCompanyAccountInput,
  }),
  Rpc.make("updateAdminCompany", {
    success: AdminCompanyLedgerEntry,
    error: Schema.Union([AdminRpcAccessError, HttpApiError.NotFound, HttpApiError.BadRequest]),
    payload: UpdateAdminCompanyInput,
  }),
  Rpc.make("deleteAdminCompany", {
    success: Schema.Boolean,
    error: Schema.Union([AdminRpcAccessError, HttpApiError.NotFound]),
    payload: DeleteAdminCompanyInput,
  }),
  Rpc.make("createAdminZone", {
    success: Zone,
    error: Schema.Union([AdminRpcAccessError, HttpApiError.BadRequest]),
    payload: CreateAdminZoneInput,
  }),
  Rpc.make("updateAdminZone", {
    success: Zone,
    error: Schema.Union([AdminRpcAccessError, HttpApiError.NotFound, HttpApiError.BadRequest]),
    payload: UpdateAdminZoneInput,
  }),
  Rpc.make("deleteAdminZone", {
    success: Schema.Boolean,
    error: Schema.Union([AdminRpcAccessError, HttpApiError.NotFound]),
    payload: DeleteAdminZoneInput,
  }),
  Rpc.make("importAdminCompaniesCsv", {
    success: Schema.Number,
    error: Schema.Union([AdminRpcAccessError, HttpApiError.BadRequest]),
    payload: ImportAdminCompaniesCsvInput,
  }),
).middleware(CurrentActorRpcMiddleware);

export const PublicFeaturedCompanyRpcGroup = RpcGroup.make(
  Rpc.make("listFeaturedCompanies", {
    success: Schema.Array(FeaturedCompany),
  }),
);
