import { DB } from "@project/db";
import { ServerEnv } from "@project/env/server";
import { Effect, Layer, Redacted, ServiceMap } from "effect";

export class InfrastructureProbeRepository extends ServiceMap.Service<
  InfrastructureProbeRepository,
  {
    readonly checkDatabase: Effect.Effect<"ok", Error>;
    readonly checkStorage: Effect.Effect<"ok", Error>;
  }
>()("@project/web/InfrastructureProbeRepository") {
  static readonly layer = Layer.effect(
    InfrastructureProbeRepository,
    Effect.gen(function* () {
      const db = yield* DB;
      const env = yield* ServerEnv;

      const s3 = new Bun.S3Client({
        accessKeyId: Redacted.value(env.s3AccessKeyId),
        secretAccessKey: Redacted.value(env.s3SecretAccessKey),
        bucket: env.s3Bucket,
        endpoint: env.s3Endpoint.toString(),
        region: env.s3Region,
      });

      return InfrastructureProbeRepository.of({
        checkDatabase: Effect.gen(function* () {
          yield* Effect.promise(() => db.$client.query("select 1"));
          return "ok" as const;
        }),
        checkStorage: Effect.gen(function* () {
          const key = `readiness/${crypto.randomUUID()}.txt`;
          const file = s3.file(key);
          const payload = JSON.stringify({
            checkedAt: new Date().toISOString(),
          });

          yield* Effect.promise(() => file.write(payload));

          return yield* Effect.gen(function* () {
            const stored = yield* Effect.promise(() => file.text());

            if (stored !== payload) {
              return yield* Effect.fail(new Error("storage probe payload mismatch"));
            }

            return "ok" as const;
          }).pipe(
            Effect.ensuring(
              Effect.promise(() => file.delete()).pipe(Effect.ignore),
            ),
          );
        }),
      });
    }),
  );
}
