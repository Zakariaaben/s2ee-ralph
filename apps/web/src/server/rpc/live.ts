import { ActorRpcGroup, CompanyRpcGroup, HealthRpcGroup, StudentRpcGroup, VenueRpcGroup } from "@project/rpc";
import { Layer } from "effect";

import { CompanyService } from "../services/company-service";
import { InfrastructureProbeRepository } from "../repositories/infrastructure-probe-repository";
import { StudentService } from "../services/student-service";
import { VenueService } from "../services/venue-service";
import { HealthService } from "../services/health-service";
import { makeActorRpcHandlers } from "./handlers/actor";
import { makeCompanyRpcHandlers } from "./handlers/company";
import { makeHealthRpcHandlers } from "./handlers/health";
import { makeStudentRpcHandlers } from "./handlers/student";
import { makeVenueRpcHandlers } from "./handlers/venue";
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

export const VenueRpcLive = VenueRpcGroup.toLayer(
  makeVenueRpcHandlers,
).pipe(Layer.provide(VenueService.layer));

export const AppRpcLive = Layer.mergeAll(
  HealthRpcLive,
  ActorRpcLive,
  CompanyRpcLive,
  StudentRpcLive,
  VenueRpcLive,
);

export const AppRpcMiddlewareLive = CurrentActorRpcMiddlewareLive;
