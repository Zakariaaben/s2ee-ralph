import {
  AdminAccessLedgerEntry,
  AdminCompanyLedgerEntry,
  AdminInterviewLedgerEntry,
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
