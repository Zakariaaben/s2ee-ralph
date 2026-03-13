import { Schema } from "effect";
import { Rpc, RpcGroup } from "effect/unstable/rpc";

export class RpcHealth extends Schema.Class<RpcHealth>("RpcHealth")({
  status: Schema.String,
  timestamp: Schema.String,
}) {}

export const HealthRpcGroup = RpcGroup.make(
  Rpc.make("health", {
    success: RpcHealth,
  }),
);
