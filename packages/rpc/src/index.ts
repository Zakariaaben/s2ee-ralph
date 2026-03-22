export * from "./groups/admin";
export * from "./groups/actor";
export * from "./groups/company";
export * from "./groups/cv-profile";
export * from "./groups/health";
export * from "./groups/interview";
export * from "./request-schemas";
export * from "./groups/student";
export * from "./groups/vocabulary";
export * from "./groups/venue";
export * from "./middleware/current-actor";

import { AdminRpcGroup } from "./groups/admin";
import { ActorRpcGroup } from "./groups/actor";
import { CompanyRpcGroup } from "./groups/company";
import { CvProfileRpcGroup } from "./groups/cv-profile";
import { HealthRpcGroup } from "./groups/health";
import { InterviewRpcGroup } from "./groups/interview";
import { StudentRpcGroup } from "./groups/student";
import { VocabularyRpcGroup } from "./groups/vocabulary";
import { VenueRpcGroup } from "./groups/venue";

export const AppRpc = HealthRpcGroup.merge(AdminRpcGroup)
  .merge(ActorRpcGroup)
  .merge(CompanyRpcGroup)
  .merge(CvProfileRpcGroup)
  .merge(InterviewRpcGroup)
  .merge(StudentRpcGroup)
  .merge(VocabularyRpcGroup)
  .merge(VenueRpcGroup);
