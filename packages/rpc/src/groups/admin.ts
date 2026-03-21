import { AdminCompanyLedgerEntry, AdminInterviewLedgerEntry } from "@project/domain";
import { Schema } from "effect";
import * as HttpApiError from "effect/unstable/httpapi/HttpApiError";
import { Rpc, RpcGroup } from "effect/unstable/rpc";

import { CurrentActorRpcMiddleware } from "../middleware/current-actor";

export const AdminRpcAccessError = Schema.Union([
  HttpApiError.Unauthorized,
  HttpApiError.Forbidden,
]);

export const AdminRpcGroup = RpcGroup.make(
  Rpc.make("listAdminCompanyLedger", {
    success: Schema.Array(AdminCompanyLedgerEntry),
    error: AdminRpcAccessError,
  }),
  Rpc.make("listAdminInterviewLedger", {
    success: Schema.Array(AdminInterviewLedgerEntry),
    error: AdminRpcAccessError,
  }),
).middleware(CurrentActorRpcMiddleware);
