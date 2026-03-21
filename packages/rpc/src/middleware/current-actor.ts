import { AuthenticatedActor } from "@project/domain";
import { ServiceMap } from "effect";
import * as HttpApiError from "effect/unstable/httpapi/HttpApiError";
import * as RpcMiddleware from "effect/unstable/rpc/RpcMiddleware";

export class CurrentActor extends ServiceMap.Service<CurrentActor, AuthenticatedActor>()(
  "@project/rpc/CurrentActor",
) {}

export class CurrentActorRpcMiddleware extends RpcMiddleware.Service<
  CurrentActorRpcMiddleware,
  {
    provides: CurrentActor;
  }
>()("@project/rpc/CurrentActorRpcMiddleware", {
  error: HttpApiError.Unauthorized,
}) {}
