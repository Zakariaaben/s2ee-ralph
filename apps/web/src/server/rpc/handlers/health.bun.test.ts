import { Effect, Layer } from "effect";
import { HealthRpcGroup } from "@project/rpc";
import { RpcTest } from "effect/unstable/rpc";
import { connect } from "node:net";

import { HealthRpcLive } from "../live";
import { beforeAll, describe, expect, itEffect } from "./bun-test";
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

const invokeHealth = () =>
  RpcTest.makeClient(HealthRpcGroup).pipe(
    Effect.flatMap((client) => client.health()),
    Effect.provide(Layer.fresh(AppReadinessLive)),
  );

const storageTestInfra = getComposeTestInfraAvailability();

if (!storageTestInfra.available) {
  warnComposeTestInfraUnavailable(storageTestInfra);
}

const isPostgresReady = () =>
  new Promise<boolean>((resolve) => {
    const socket = connect({ host: "127.0.0.1", port: 5432 }, () => {
      socket.end();
      resolve(true);
    });

    socket.once("error", () => {
      resolve(false);
    });
  });

const isStorageReady = async () => {
  try {
    const response = await fetch("http://127.0.0.1:9000/minio/health/ready");

    return response.ok;
  } catch {
    return false;
  }
};

const waitForInfra = async (timeoutMs: number) => {
  const startedAt = Date.now();

  while (Date.now() - startedAt < timeoutMs) {
    if (await isPostgresReady() && await isStorageReady()) {
      return;
    }

    await new Promise((resolve) => setTimeout(resolve, 1_000));
  }

  throw new Error("compose-backed health test infrastructure did not become ready");
};

const describeWithStorage = storageTestInfra.available ? describe : describe.skip;

describeWithStorage("health rpc", () => {
  beforeAll(async () => {
    runCompose(["up", "-d", "postgres", "minio", "minio-setup"]);
    await waitForInfra(30_000);
  });

  itEffect("reports postgres and object storage readiness", () =>
    Effect.scoped(invokeHealth()).pipe(
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
