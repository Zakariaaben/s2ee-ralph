import { Schema, ServiceMap } from "effect";
import * as RpcMiddleware from "effect/unstable/rpc/RpcMiddleware";

export class RpcCurrentUser extends Schema.Class<RpcCurrentUser>("RpcCurrentUser")({
  id: Schema.String,
  email: Schema.String,
  name: Schema.String,
}) {}

export class CurrentUser extends ServiceMap.Service<CurrentUser, RpcCurrentUser | null>()(
  "@project/rpc/CurrentUser",
) {}

export class CurrentUserRpcMiddleware extends RpcMiddleware.Service<
  CurrentUserRpcMiddleware,
  {
    provides: CurrentUser;
  }
>()("@project/rpc/CurrentUserRpcMiddleware", {
  error: Schema.Never,
}) {}
