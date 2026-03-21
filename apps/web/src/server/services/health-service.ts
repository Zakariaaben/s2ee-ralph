import { HealthChecks, HealthStatus } from "@project/domain";
import { DateTime, Effect, Layer, ServiceMap } from "effect";

import { InfrastructureProbeRepository } from "../repositories/infrastructure-probe-repository";

export class HealthService extends ServiceMap.Service<
  HealthService,
  {
    readonly check: Effect.Effect<HealthStatus>;
  }
>()("@project/web/HealthService") {
  static readonly layer = Layer.effect(
    HealthService,
    Effect.gen(function* () {
      const infrastructureProbeRepository = yield* InfrastructureProbeRepository;

      return HealthService.of({
        check: Effect.gen(function* () {
          const database = yield* infrastructureProbeRepository.checkDatabase.pipe(Effect.orDie);
          const storage = yield* infrastructureProbeRepository.checkStorage.pipe(Effect.orDie);
          const timestamp = yield* DateTime.now;

          return new HealthStatus({
            status: "ok",
            timestamp,
            checks: new HealthChecks({
              database,
              storage,
            }),
          });
        }),
      });
    }),
  );
}
