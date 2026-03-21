export * from "./groups/actor";
export * from "./groups/company";
export * from "./groups/cv-profile";
export * from "./groups/health";
export * from "./groups/interview";
export * from "./groups/student";
export * from "./groups/vocabulary";
export * from "./groups/venue";
export * from "./middleware/current-actor";

import { ActorRpcGroup } from "./groups/actor";
import { CompanyRpcGroup } from "./groups/company";
import { CvProfileRpcGroup } from "./groups/cv-profile";
import { HealthRpcGroup } from "./groups/health";
import { InterviewRpcGroup } from "./groups/interview";
import { StudentRpcGroup } from "./groups/student";
import { VocabularyRpcGroup } from "./groups/vocabulary";
import { VenueRpcGroup } from "./groups/venue";

export const AppRpc = HealthRpcGroup.merge(ActorRpcGroup)
  .merge(CompanyRpcGroup)
  .merge(CvProfileRpcGroup)
  .merge(InterviewRpcGroup)
  .merge(StudentRpcGroup)
  .merge(VocabularyRpcGroup)
  .merge(VenueRpcGroup);
