export * from "./groups/actor";
export * from "./groups/company";
export * from "./groups/health";
export * from "./middleware/current-actor";

import { ActorRpcGroup } from "./groups/actor";
import { CompanyRpcGroup } from "./groups/company";
import { HealthRpcGroup } from "./groups/health";

export const AppRpc = HealthRpcGroup.merge(ActorRpcGroup).merge(CompanyRpcGroup);
