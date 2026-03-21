import { beforeAll, describe, expect, test } from "bun:test";
import { execFileSync } from "node:child_process";
import { DBLive } from "@project/db";
import { ServerEnv } from "@project/env/server";
import { HealthRpcGroup } from "@project/rpc";
import { Effect, Layer, Redacted } from "effect";
import { RpcTest } from "effect/unstable/rpc";

import { HealthRpcLive } from "../live";

const composeProjectRoot = new URL("../../../../../..", import.meta.url);

const TestServerEnvLive = Layer.succeed(
  ServerEnv,
  ServerEnv.of({
    databaseUrl: Redacted.make(
      "postgresql://project:project@127.0.0.1:5432/project",
    ),
    betterAuthSecret: Redacted.make("development-only-secret"),
    betterAuthUrl: new URL("http://127.0.0.1:3001"),
    corsOrigin: new URL("http://127.0.0.1:3001"),
    nodeEnv: "test",
    s3AccessKeyId: Redacted.make("minioadmin"),
    s3SecretAccessKey: Redacted.make("minioadmin"),
    s3Bucket: "project-local",
    s3Endpoint: new URL("http://127.0.0.1:9000"),
    s3Region: "us-east-1",
  }),
);

const DatabaseTestLive = DBLive.pipe(Layer.provide(TestServerEnvLive));

const AppReadinessLive = HealthRpcLive.pipe(
  Layer.provideMerge(DatabaseTestLive),
  Layer.provideMerge(TestServerEnvLive),
);
const runCompose = (args: string[]) => {
  execFileSync("docker", ["compose", ...args], {
    cwd: composeProjectRoot,
    stdio: "pipe",
  });
};

const invokeHealth = () =>
  Effect.gen(function* () {
    const client = yield* RpcTest.makeClient(HealthRpcGroup);

    return yield* client.health();
  }).pipe(Effect.scoped, Effect.provide(AppReadinessLive));

const waitForHealth = async (timeoutMs: number) => {
  const startedAt = Date.now();
  let lastError: unknown;

  while (Date.now() - startedAt < timeoutMs) {
    try {
      return await Effect.runPromise(invokeHealth());
    } catch (error) {
      lastError = error;
      await Bun.sleep(1_000);
    }
  }

  throw lastError;
};

beforeAll(async () => {
  runCompose(["up", "-d", "postgres", "minio", "minio-setup"]);
  await waitForHealth(30_000);
});

describe("health rpc", () => {
  test("reports postgres and object storage readiness", async () => {
    const health = await waitForHealth(5_000);

    expect(health.status).toBe("ok");
    expect(health.checks).toEqual({
      database: "ok",
      storage: "ok",
    });
  });
});
