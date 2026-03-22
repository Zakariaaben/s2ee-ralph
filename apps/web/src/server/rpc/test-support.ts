import { makeAuth } from "@project/auth";
import { DB, DBLive } from "@project/db";
import { type UserRoleValue } from "@project/domain";
import { ServerEnv } from "@project/env/server";
import type { TestHelpers } from "better-auth/plugins";
import { Effect, Layer, Redacted } from "effect";
import type { AnyPgTable } from "drizzle-orm/pg-core";
import { execFileSync } from "node:child_process";

const composeProjectRoot = new URL("../../../../..", import.meta.url);
const warnedComposeInfraReasonsKey = "__projectRpcWarnedComposeInfraReasons";

export const testOrigin = "http://127.0.0.1:3001";

type ComposeTestInfraAvailability =
  | {
      available: true;
    }
  | {
      available: false;
      reason: string;
    };

const getWarnedComposeInfraReasons = () => {
  const globalState = globalThis as typeof globalThis & {
    [warnedComposeInfraReasonsKey]?: Set<string>;
  };

  globalState[warnedComposeInfraReasonsKey] ??= new Set<string>();

  return globalState[warnedComposeInfraReasonsKey];
};

export const TestServerEnvLive = Layer.succeed(
  ServerEnv,
  ServerEnv.of({
    databaseUrl: Redacted.make(
      "postgresql://project:project@127.0.0.1:5432/project",
    ),
    betterAuthSecret: Redacted.make("development-only-secret"),
    betterAuthUrl: new URL(testOrigin),
    corsOrigin: new URL(testOrigin),
    nodeEnv: "test",
    s3AccessKeyId: Redacted.make("minioadmin"),
    s3SecretAccessKey: Redacted.make("minioadmin"),
    s3Bucket: "project-local",
    s3Endpoint: new URL("http://127.0.0.1:9000"),
    s3Region: "us-east-1",
  }),
);

export const DatabaseTestLive = Layer.fresh(
  DBLive.pipe(Layer.provide(TestServerEnvLive)),
);

const makeAuthTestLive = () =>
  Layer.fresh(Layer.mergeAll(TestServerEnvLive, DatabaseTestLive));

export const makeRpcTestLive = (
  ...layers: [
    Layer.Layer<any, any, any>,
    ...Array<Layer.Layer<any, any, any>>,
  ]
) =>
  Layer.fresh(Layer.mergeAll(...layers)).pipe(
  Layer.provideMerge(DatabaseTestLive),
  Layer.provideMerge(TestServerEnvLive),
  );

export const runTestEffect = <A, E>(effect: Effect.Effect<A, E, never>) => async () => {
  await Effect.runPromise(effect);
};

export const runLayerEffect = <A, E, R>(
  layer: Layer.Layer<R, any, any>,
  run: () => Effect.Effect<A, E, R>,
) => async () => {
  await Effect.runPromise(
    Effect.scoped(
      run().pipe(Effect.provide(Layer.fresh(layer))) as Effect.Effect<A, E, never>,
    ),
  );
};

const runDockerInfo = () => {
  execFileSync("docker", ["info"], {
    cwd: composeProjectRoot,
    stdio: "pipe",
  });
};

const formatComposeInfraError = (error: unknown) => {
  if (
    typeof error === "object"
    && error !== null
    && "stderr" in error
    && error.stderr instanceof Buffer
  ) {
    const stderr = error.stderr.toString("utf8").trim();

    if (stderr.length > 0) {
      return stderr;
    }
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "unknown docker error";
};

export const getComposeTestInfraAvailability = (
  dockerInfo: () => void = runDockerInfo,
): ComposeTestInfraAvailability => {
  try {
    dockerInfo();

    return {
      available: true,
    };
  } catch (error) {
    return {
      available: false,
      reason: formatComposeInfraError(error),
    };
  }
};

export const warnComposeTestInfraUnavailable = (
  availability: Extract<ComposeTestInfraAvailability, { available: false }>,
) => {
  const warnedComposeInfraReasons = getWarnedComposeInfraReasons();

  if (warnedComposeInfraReasons.has(availability.reason)) {
    return;
  }

  warnedComposeInfraReasons.add(availability.reason);
  console.warn(
    `[rpc test support] skipping compose-backed integration tests: ${availability.reason}`,
  );
};

export const runCompose = (args: ReadonlyArray<string>) => {
  execFileSync("docker", ["compose", ...args], {
    cwd: composeProjectRoot,
    stdio: "pipe",
  });
};

export const runBun = (args: ReadonlyArray<string>) => {
  execFileSync("bun", [...args], {
    cwd: composeProjectRoot,
    stdio: "pipe",
  });
};

export const startPostgresTestInfra = () => {
  runCompose(["up", "-d", "postgres"]);
  runBun(["run", "db:push"]);
};

export const startPostgresAndStorageTestInfra = () => {
  runCompose(["up", "-d", "postgres", "minio", "minio-setup"]);
  runBun(["run", "db:push"]);
};

export const resetTables = (tables: ReadonlyArray<AnyPgTable>) =>
  Effect.gen(function*() {
    const db = yield* DB;

    yield* Effect.forEach(
      tables,
      (table) => Effect.promise(() => db.delete(table).execute()),
      { discard: true },
    );
  }).pipe(Effect.provide(DatabaseTestLive));

export const provisionSessionHeaders = (role: UserRoleValue) =>
  Effect.gen(function*() {
    const auth = yield* makeAuth;
    const authContext = yield* Effect.promise(() => auth.$context);
    const test = (authContext as typeof authContext & { test?: TestHelpers }).test;

    if (!test) {
      throw new Error("Better Auth test utils are not available in the test environment");
    }

    const createdUser = test.createUser({
      email: `${role}-${Date.now()}@example.com`,
      name: `${role} actor`,
      role,
      emailVerified: false,
    });
    const savedUser = yield* Effect.promise(() => test.saveUser(createdUser));
    const headers = yield* Effect.promise(() => test.getAuthHeaders({ userId: savedUser.id }));

    headers.set("origin", testOrigin);

    return headers;
  }).pipe(Effect.provide(makeAuthTestLive()));
