import { Schema } from "effect";
import { Rpc, RpcGroup } from "effect/unstable/rpc";

export class RpcHealthChecks extends Schema.Class<RpcHealthChecks>("RpcHealthChecks")({
  database: Schema.Literal("ok"),
  storage: Schema.Literal("ok"),
}) {}

export class RpcHealth extends Schema.Class<RpcHealth>("RpcHealth")({
  status: Schema.String,
  timestamp: Schema.String,
  checks: RpcHealthChecks,
}) {}

export const HealthRpcGroup = RpcGroup.make(
  Rpc.make("health", {
    success: RpcHealth,
  }),
);
