import { beforeAll, describe, expect, it } from "@effect/vitest";
import { Effect, Layer } from "effect";
import { HealthRpcGroup } from "@project/rpc";
import { RpcTest } from "effect/unstable/rpc";

import { HealthRpcLive } from "../live";
import {
  DatabaseTestLive,
  TestServerEnvLive,
  runCompose,
} from "../test-support";

const AppReadinessLive = HealthRpcLive.pipe(
  Layer.provideMerge(DatabaseTestLive),
  Layer.provideMerge(TestServerEnvLive),
);

const invokeHealth = RpcTest.makeClient(HealthRpcGroup).pipe(
  Effect.provide(AppReadinessLive),
  Effect.flatMap((client) => client.health()),
);

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

beforeAll(async () => {
  runCompose(["up", "-d", "postgres", "minio", "minio-setup"]);
  await waitForHealth(30_000);
});

describe("health rpc", () => {
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
