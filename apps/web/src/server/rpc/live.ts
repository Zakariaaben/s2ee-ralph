import { ActorRpcGroup, CompanyRpcGroup, HealthRpcGroup, StudentRpcGroup } from "@project/rpc";
import { Layer } from "effect";

import { CompanyService } from "../services/company-service";
import { InfrastructureProbeRepository } from "../repositories/infrastructure-probe-repository";
import { StudentService } from "../services/student-service";
import { HealthService } from "../services/health-service";
import { makeActorRpcHandlers } from "./handlers/actor";
import { makeCompanyRpcHandlers } from "./handlers/company";
import { makeHealthRpcHandlers } from "./handlers/health";
import { makeStudentRpcHandlers } from "./handlers/student";
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

export const StudentRpcLive = StudentRpcGroup.toLayer(
  makeStudentRpcHandlers,
).pipe(Layer.provide(StudentService.layer));

export const AppRpcLive = Layer.mergeAll(
  HealthRpcLive,
  ActorRpcLive,
  CompanyRpcLive,
  StudentRpcLive,
);

export const AppRpcMiddlewareLive = CurrentActorRpcMiddlewareLive;
