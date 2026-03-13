import { AppRpc } from "@project/rpc";
import { Layer } from "effect";
import { FetchHttpClient, HttpClient, HttpClientRequest } from "effect/unstable/http";
import { AtomRpc } from "effect/unstable/reactivity";
import { RpcClient, RpcSerialization } from "effect/unstable/rpc";

const AppRpcProtocol = RpcClient.layerProtocolHttp({
  url: "",
  transformClient: HttpClient.mapRequest(HttpClientRequest.appendUrl("/api/rpc")),
}).pipe(
  Layer.provideMerge(FetchHttpClient.layer),
  Layer.provideMerge(RpcSerialization.layerNdjson),
);

export const AppRpcClient = AtomRpc.Service()("@project/web/AppRpcClient", {
  group: AppRpc,
  protocol: AppRpcProtocol,
});
