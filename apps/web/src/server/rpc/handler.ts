import { DatabaseLive } from "@project/db";
import { ServerEnvLive } from "@project/env/server";
import { AppRpc } from "@project/rpc";
import { Effect, Layer } from "effect";
import { HttpEffect } from "effect/unstable/http";
import { RpcSerialization, RpcServer } from "effect/unstable/rpc";

import { AppRpcLive, AppRpcMiddlewareLive } from "./live";
import { appMemoMap } from "../runtime";

const RpcHandlerLive = Layer.mergeAll(
  AppRpcLive,
  AppRpcMiddlewareLive,
  RpcSerialization.layerNdjson,
).pipe(
  Layer.provideMerge(DatabaseLive),
  Layer.provideMerge(ServerEnvLive),
);

const RpcHttpEffect = Effect.flatten(
  RpcServer.toHttpEffect(AppRpc, {
    disableFatalDefects: true,
  }),
);

export const rpcHandler = HttpEffect.toWebHandlerLayer(RpcHttpEffect, RpcHandlerLive, {
  memoMap: appMemoMap,
}).handler;
