import { makeAuth } from "@project/auth";
import { afterEach, beforeAll, describe, expect, test } from "bun:test";
import { execFileSync } from "node:child_process";
import { DB, DBLive } from "@project/db";
import { account, session, user } from "@project/db/schema/auth";
import { UserRoleValues, type UserRoleValue } from "@project/domain";
import { ServerEnv } from "@project/env/server";
import { ActorRpcGroup } from "@project/rpc";
import { setCookieToHeader } from "better-auth/cookies";
import { Effect, Layer, Redacted } from "effect";
import * as RpcClient from "effect/unstable/rpc/RpcClient";
import { RpcTest } from "effect/unstable/rpc";

import { ActorRpcLive, AppRpcMiddlewareLive } from "../live";

const composeProjectRoot = new URL("../../../../../..", import.meta.url);
const origin = "http://127.0.0.1:3001";

const TestServerEnvLive = Layer.succeed(
  ServerEnv,
  ServerEnv.of({
    databaseUrl: Redacted.make(
      "postgresql://project:project@127.0.0.1:5432/project",
    ),
    betterAuthSecret: Redacted.make("development-only-secret"),
    betterAuthUrl: new URL(origin),
    corsOrigin: new URL(origin),
    nodeEnv: "test",
    s3AccessKeyId: Redacted.make("unused"),
    s3SecretAccessKey: Redacted.make("unused"),
    s3Bucket: "unused",
    s3Endpoint: new URL("http://127.0.0.1:9000"),
    s3Region: "us-east-1",
  }),
);

const DatabaseTestLive = DBLive.pipe(Layer.provide(TestServerEnvLive));

const ActorTestLive = Layer.mergeAll(
  ActorRpcLive,
  AppRpcMiddlewareLive,
).pipe(
  Layer.provideMerge(DatabaseTestLive),
  Layer.provideMerge(TestServerEnvLive),
);

const runCompose = (args: string[]) => {
  execFileSync("docker", ["compose", ...args], {
    cwd: composeProjectRoot,
    stdio: "pipe",
  });
};

const runBun = (args: string[]) => {
  execFileSync("bun", args, {
    cwd: composeProjectRoot,
    stdio: "pipe",
  });
};

const makeActorClient = () =>
  Effect.gen(function*() {
    return yield* RpcTest.makeClient(ActorRpcGroup);
  }).pipe(Effect.scoped, Effect.provide(ActorTestLive));

const resetAuthTables = () =>
  Effect.gen(function*() {
    const db = yield* DB;

    yield* Effect.promise(() => db.delete(session).execute());
    yield* Effect.promise(() => db.delete(account).execute());
    yield* Effect.promise(() => db.delete(user).execute());
  }).pipe(Effect.provide(DatabaseTestLive));

const provisionSessionHeaders = (role: UserRoleValue) =>
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
      origin,
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
  }).pipe(Effect.provide(Layer.mergeAll(TestServerEnvLive, DatabaseTestLive)));

beforeAll(() => {
  runCompose(["up", "-d", "postgres"]);
  runBun(["run", "db:push"]);
});

afterEach(async () => {
  await Effect.runPromise(resetAuthTables());
});

describe("actor rpc", () => {
  test("resolves the current actor role from the auth session", async () => {
    const headers = await Effect.runPromise(provisionSessionHeaders("company"));
    const client = await Effect.runPromise(makeActorClient());

    const actor = await Effect.runPromise(
      client.currentActor().pipe(
        RpcClient.withHeaders(headers),
      ),
    );

    expect(actor.role).toBe("company");
    expect(actor.email).toContain("@example.com");
  });

  test("rejects unauthenticated actor access", async () => {
    const client = await Effect.runPromise(makeActorClient());

    const exit = await Effect.runPromiseExit(client.currentActor());

    expect(exit._tag).toBe("Failure");
  });

  test("enforces the expected role for protected probes", async () => {
    const client = await Effect.runPromise(makeActorClient());

    for (const role of UserRoleValues) {
      const headers = await Effect.runPromise(provisionSessionHeaders(role));

      const adminExit = await Effect.runPromiseExit(
        client.requireAdminAccess().pipe(RpcClient.withHeaders(headers)),
      );
      const studentExit = await Effect.runPromiseExit(
        client.requireStudentAccess().pipe(RpcClient.withHeaders(headers)),
      );
      const companyExit = await Effect.runPromiseExit(
        client.requireCompanyAccess().pipe(RpcClient.withHeaders(headers)),
      );
      const checkInExit = await Effect.runPromiseExit(
        client.requireCheckInAccess().pipe(RpcClient.withHeaders(headers)),
      );

      if (role === "admin") {
        expect(adminExit._tag).toBe("Success");
      } else {
        expect(adminExit._tag).toBe("Failure");
      }

      if (role === "student") {
        expect(studentExit._tag).toBe("Success");
      } else {
        expect(studentExit._tag).toBe("Failure");
      }

      if (role === "company") {
        expect(companyExit._tag).toBe("Success");
      } else {
        expect(companyExit._tag).toBe("Failure");
      }

      if (role === "check-in") {
        expect(checkInExit._tag).toBe("Success");
      } else {
        expect(checkInExit._tag).toBe("Failure");
      }
    }
  });
});
