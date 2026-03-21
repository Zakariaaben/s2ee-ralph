import { makeAuth } from "@project/auth";
import { DB, DBLive } from "@project/db";
import { type UserRoleValue } from "@project/domain";
import { ServerEnv } from "@project/env/server";
import { setCookieToHeader } from "better-auth/cookies";
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

export const DatabaseTestLive = DBLive.pipe(Layer.provide(TestServerEnvLive));

const AuthTestLive = Layer.mergeAll(TestServerEnvLive, DatabaseTestLive);

export const makeRpcTestLive = (
  ...layers: [
    Layer.Layer<any, any, any>,
    ...Array<Layer.Layer<any, any, any>>,
  ]
) =>
  Layer.mergeAll(...layers).pipe(
  Layer.provideMerge(DatabaseTestLive),
  Layer.provideMerge(TestServerEnvLive),
  );

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
    const password = "password-123456";
    const email = `${role}-${Date.now()}@example.com`;
    const passwordHash = yield* Effect.promise(() => authContext.password.hash(password));
    const createdUser = yield* Effect.promise(() =>
      authContext.internalAdapter.createUser({
        email,
        name: `${role} actor`,
        role,
        emailVerified: false,
      }),
    );

    yield* Effect.promise(() =>
      authContext.internalAdapter.linkAccount({
        userId: createdUser.id,
        providerId: "credential",
        accountId: createdUser.id,
        password: passwordHash,
      }),
    );

    const headers = new Headers({
      origin: testOrigin,
    });

    const signIn = yield* Effect.promise(() =>
      auth.api.signInEmail({
        headers,
        body: {
          email,
          password,
        },
        returnHeaders: true,
      }),
    );

    setCookieToHeader(headers)({
      response: new Response(null, {
        headers: signIn.headers,
      }),
    });

    return headers;
  }).pipe(Effect.provide(AuthTestLive));
