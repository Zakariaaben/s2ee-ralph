import { DatabaseLive } from "@project/db";
import { ServerEnvLive } from "@project/env/server";
import { AppRpc } from "@project/rpc";
import { Layer } from "effect";
import { HttpRouter } from "effect/unstable/http";
import { RpcSerialization, RpcServer } from "effect/unstable/rpc";

import { AppRpcLive, AppRpcMiddlewareLive } from "./live";
import { appMemoMap } from "../runtime";

const HttpProtocol = RpcServer.layerProtocolHttp({
  path: "/api/rpc",
});

const RpcServerLive = RpcServer.layer(AppRpc, {
  disableFatalDefects: true,
}).pipe(
  Layer.provide([AppRpcLive, AppRpcMiddlewareLive]),
);

const RpcAppLive = RpcServerLive.pipe(
  Layer.provideMerge(HttpProtocol),
  Layer.provideMerge(DatabaseLive),
  Layer.provideMerge(ServerEnvLive),
  Layer.provideMerge(RpcSerialization.layerNdjson),
);

export const rpcHandler = HttpRouter.toWebHandler(RpcAppLive, {
  memoMap: appMemoMap,
  disableLogger: true,
}).handler;
