import { Layer } from "effect";
import { HealthRpcGroup } from "@project/rpc";

import { HealthService } from "../services/health-service";
import { makeHealthRpcHandlers } from "./handlers/health";

const HealthRpcLive = HealthRpcGroup.toLayer(
  makeHealthRpcHandlers,
).pipe(Layer.provide(HealthService.layer));

export const AppRpcLive = HealthRpcLive;
