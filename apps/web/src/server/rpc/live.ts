import { Layer } from "effect";
import { HealthRpcGroup } from "@project/rpc";

import { InfrastructureProbeRepository } from "../repositories/infrastructure-probe-repository";
import { HealthService } from "../services/health-service";
import { makeHealthRpcHandlers } from "./handlers/health";

const HealthRpcLive = HealthRpcGroup.toLayer(
  makeHealthRpcHandlers,
).pipe(
  Layer.provide(
    HealthService.layer.pipe(Layer.provide(InfrastructureProbeRepository.layer)),
  ),
);

export const AppRpcLive = HealthRpcLive;
