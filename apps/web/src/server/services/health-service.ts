import { Effect, Layer, ServiceMap } from "effect";

import type { HealthStatus } from "../domain/health";

export class HealthService extends ServiceMap.Service<
  HealthService,
  {
    readonly check: Effect.Effect<HealthStatus>;
  }
>()("@project/web/HealthService") {
  static readonly layer = Layer.succeed(
    HealthService,
    HealthService.of({
      check: Effect.succeed({
        status: "ok",
        timestamp: new Date().toISOString(),
      }),
    }),
  );
}
