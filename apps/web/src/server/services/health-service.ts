import { HealthStatus } from "@project/domain";
import { DateTime, Effect, Layer, ServiceMap } from "effect";

export class HealthService extends ServiceMap.Service<
  HealthService,
  {
    readonly check: Effect.Effect<HealthStatus>;
  }
>()("@project/web/HealthService") {
  static readonly layer = Layer.succeed(
    HealthService,
    HealthService.of({
      check: Effect.gen(function* () {
        const timestamp = yield* DateTime.now;
        return new HealthStatus({
          status: "ok",
          timestamp,
        });
      }),
    }),
  );
}
