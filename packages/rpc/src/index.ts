export * from "./groups/health";
export * from "./middleware/current-user";

import { HealthRpcGroup } from "./groups/health";

export const AppRpc = HealthRpcGroup;
