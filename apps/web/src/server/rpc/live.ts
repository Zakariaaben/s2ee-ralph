import { ActorRpcGroup, CompanyRpcGroup, HealthRpcGroup } from "@project/rpc";
import { Layer } from "effect";

import { CompanyService } from "../services/company-service";
import { InfrastructureProbeRepository } from "../repositories/infrastructure-probe-repository";
import { HealthService } from "../services/health-service";
import { makeActorRpcHandlers } from "./handlers/actor";
import { makeCompanyRpcHandlers } from "./handlers/company";
import { makeHealthRpcHandlers } from "./handlers/health";
import { CurrentActorRpcMiddlewareLive } from "./middleware/current-actor";

export const HealthRpcLive = HealthRpcGroup.toLayer(
  makeHealthRpcHandlers,
).pipe(
  Layer.provide(
    HealthService.layer.pipe(Layer.provide(InfrastructureProbeRepository.layer)),
  ),
);

export const ActorRpcLive = ActorRpcGroup.toLayer(makeActorRpcHandlers);

export const CompanyRpcLive = CompanyRpcGroup.toLayer(
  makeCompanyRpcHandlers,
).pipe(Layer.provide(CompanyService.layer));

export const AppRpcLive = Layer.mergeAll(
  HealthRpcLive,
  ActorRpcLive,
  CompanyRpcLive,
);

export const AppRpcMiddlewareLive = CurrentActorRpcMiddlewareLive;
