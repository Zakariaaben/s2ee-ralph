import {
  ActorRpcGroup,
  CompanyRpcGroup,
  CvProfileRpcGroup,
  HealthRpcGroup,
  StudentRpcGroup,
  VenueRpcGroup,
  VocabularyRpcGroup,
} from "@project/rpc";
import { Layer } from "effect";

import { CompanyService } from "../services/company-service";
import { CvProfileService } from "../services/cv-profile-service";
import { InfrastructureProbeRepository } from "../repositories/infrastructure-probe-repository";
import { StudentService } from "../services/student-service";
import { VenueService } from "../services/venue-service";
import { VocabularyService } from "../services/vocabulary-service";
import { HealthService } from "../services/health-service";
import { makeActorRpcHandlers } from "./handlers/actor";
import { makeCompanyRpcHandlers } from "./handlers/company";
import { makeCvProfileRpcHandlers } from "./handlers/cv-profile";
import { makeHealthRpcHandlers } from "./handlers/health";
import { makeStudentRpcHandlers } from "./handlers/student";
import { makeVenueRpcHandlers } from "./handlers/venue";
import { makeVocabularyRpcHandlers } from "./handlers/vocabulary";
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

export const CvProfileRpcLive = CvProfileRpcGroup.toLayer(
  makeCvProfileRpcHandlers,
).pipe(Layer.provide(CvProfileService.layer));

export const StudentRpcLive = StudentRpcGroup.toLayer(
  makeStudentRpcHandlers,
).pipe(Layer.provide(StudentService.layer));

export const VenueRpcLive = VenueRpcGroup.toLayer(
  makeVenueRpcHandlers,
).pipe(Layer.provide(VenueService.layer));

export const VocabularyRpcLive = VocabularyRpcGroup.toLayer(
  makeVocabularyRpcHandlers,
).pipe(Layer.provide(VocabularyService.layer));

export const AppRpcLive = Layer.mergeAll(
  HealthRpcLive,
  ActorRpcLive,
  CompanyRpcLive,
  CvProfileRpcLive,
  StudentRpcLive,
  VocabularyRpcLive,
  VenueRpcLive,
);

export const AppRpcMiddlewareLive = CurrentActorRpcMiddlewareLive;
