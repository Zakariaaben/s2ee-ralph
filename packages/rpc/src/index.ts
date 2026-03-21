export * from "./groups/actor";
export * from "./groups/health";
export * from "./middleware/current-actor";

import { ActorRpcGroup } from "./groups/actor";
import { HealthRpcGroup } from "./groups/health";

export const AppRpc = HealthRpcGroup.merge(ActorRpcGroup);
