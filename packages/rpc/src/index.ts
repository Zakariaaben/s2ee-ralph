export * from "./groups/actor";
export * from "./groups/company";
export * from "./groups/health";
export * from "./groups/student";
export * from "./groups/venue";
export * from "./middleware/current-actor";

import { ActorRpcGroup } from "./groups/actor";
import { CompanyRpcGroup } from "./groups/company";
import { HealthRpcGroup } from "./groups/health";
import { StudentRpcGroup } from "./groups/student";
import { VenueRpcGroup } from "./groups/venue";

export const AppRpc = HealthRpcGroup.merge(ActorRpcGroup)
  .merge(CompanyRpcGroup)
  .merge(StudentRpcGroup)
  .merge(VenueRpcGroup);
