import { HealthRpcGroup, RpcHealth } from "@project/rpc";
import { Effect } from "effect";

import { HealthService } from "../../services/health-service";

export const makeHealthRpcHandlers = Effect.gen(function* () {
  const healthService = yield* HealthService;

  return HealthRpcGroup.of({
    health: () =>
      Effect.gen(function* () {
        const health = yield* healthService.check;
        return new RpcHealth({
          status: health.status,
          timestamp: health.timestamp,
        });
      }),
  });
});
