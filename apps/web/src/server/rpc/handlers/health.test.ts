import { beforeAll, describe, expect, it } from "@effect/vitest";
import { Effect, Layer } from "effect";
import { HealthRpcGroup } from "@project/rpc";
import { RpcTest } from "effect/unstable/rpc";

import { HealthRpcLive } from "../live";
import {
  DatabaseTestLive,
  TestServerEnvLive,
  getComposeTestInfraAvailability,
  runCompose,
  warnComposeTestInfraUnavailable,
} from "../test-support";

const AppReadinessLive = HealthRpcLive.pipe(
  Layer.provideMerge(DatabaseTestLive),
  Layer.provideMerge(TestServerEnvLive),
);

const invokeHealth = RpcTest.makeClient(HealthRpcGroup).pipe(
  Effect.provide(AppReadinessLive),
  Effect.flatMap((client) => client.health()),
);

const storageTestInfra = getComposeTestInfraAvailability();

if (!storageTestInfra.available) {
  warnComposeTestInfraUnavailable(storageTestInfra);
}

const waitForHealth = async (timeoutMs: number) => {
  const startedAt = Date.now();
  let lastError: unknown;

  while (Date.now() - startedAt < timeoutMs) {
    try {
      return await Effect.runPromise(Effect.scoped(invokeHealth));
    } catch (error) {
      lastError = error;
      await new Promise((resolve) => setTimeout(resolve, 1_000));
    }
  }

  throw lastError;
};

const describeWithStorage = storageTestInfra.available ? describe : describe.skip;

describeWithStorage("health rpc", () => {
  beforeAll(async () => {
    runCompose(["up", "-d", "postgres", "minio", "minio-setup"]);
    await waitForHealth(30_000);
  });

  it.effect("reports postgres and object storage readiness", () =>
    Effect.promise(() => waitForHealth(5_000)).pipe(
      Effect.tap((health) =>
        Effect.sync(() => {
          expect(health.status).toBe("ok");
          expect(health.checks).toEqual({
            database: "ok",
            storage: "ok",
          });
        }),
      ),
    ));
});
