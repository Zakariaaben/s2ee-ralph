import { makeAuth } from "@project/auth";
import { DB, DBLive } from "@project/db";
import { account, session, user } from "@project/db/schema/auth";
import { student as studentTable } from "@project/db/schema/student";
import { type UserRoleValue } from "@project/domain";
import { ServerEnv } from "@project/env/server";
import { StudentRpcGroup } from "@project/rpc";
import { afterEach, beforeAll, describe, expect, test } from "bun:test";
import { setCookieToHeader } from "better-auth/cookies";
import { Effect, Layer, Redacted } from "effect";
import * as RpcClient from "effect/unstable/rpc/RpcClient";
import { RpcTest } from "effect/unstable/rpc";
import { execFileSync } from "node:child_process";

import { AppRpcMiddlewareLive, StudentRpcLive } from "../live";

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

const StudentTestLive = Layer.mergeAll(
  StudentRpcLive,
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

const makeStudentClient = () =>
  Effect.gen(function*() {
    return yield* RpcTest.makeClient(StudentRpcGroup);
  }).pipe(Effect.scoped, Effect.provide(StudentTestLive));

const resetTables = () =>
  Effect.gen(function*() {
    const db = yield* DB;

    yield* Effect.promise(() => db.delete(studentTable).execute());
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
  await Effect.runPromise(resetTables());
});

describe("student rpc", () => {
  test("student actors can create and read back their onboarding record and issue a QR identity", async () => {
    const headers = await Effect.runPromise(provisionSessionHeaders("student"));
    const client = await Effect.runPromise(makeStudentClient());

    const before = await Effect.runPromise(
      client.currentStudent().pipe(
        RpcClient.withHeaders(headers),
      ),
    );

    expect(before).toBeNull();

    const student = await Effect.runPromise(
      client.upsertStudentOnboarding({
        firstName: "Ada",
        lastName: "Lovelace",
        course: "Computer Science",
      }).pipe(RpcClient.withHeaders(headers)),
    );

    expect(student.firstName).toBe("Ada");
    expect(student.lastName).toBe("Lovelace");
    expect(student.course).toBe("Computer Science");

    const after = await Effect.runPromise(
      client.currentStudent().pipe(
        RpcClient.withHeaders(headers),
      ),
    );

    expect(after).toEqual(student);

    const qrIdentity = await Effect.runPromise(
      client.issueStudentQrIdentity().pipe(
        RpcClient.withHeaders(headers),
      ),
    );

    expect(qrIdentity).toBe(`student:v1:${student.id}`);
  });

  test("company actors can resolve issued student QR identities while malformed payloads stay rejected", async () => {
    const studentHeaders = await Effect.runPromise(provisionSessionHeaders("student"));
    const companyHeaders = await Effect.runPromise(provisionSessionHeaders("company"));
    const client = await Effect.runPromise(makeStudentClient());

    const student = await Effect.runPromise(
      client.upsertStudentOnboarding({
        firstName: "Grace",
        lastName: "Hopper",
        course: "Computer Science",
      }).pipe(RpcClient.withHeaders(studentHeaders)),
    );

    const qrIdentity = await Effect.runPromise(
      client.issueStudentQrIdentity().pipe(
        RpcClient.withHeaders(studentHeaders),
      ),
    );

    const resolved = await Effect.runPromise(
      client.resolveStudentQrIdentity({ qrIdentity }).pipe(
        RpcClient.withHeaders(companyHeaders),
      ),
    );

    expect(resolved).toEqual(student);

    const wrongRoleExit = await Effect.runPromiseExit(
      client.resolveStudentQrIdentity({ qrIdentity }).pipe(
        RpcClient.withHeaders(studentHeaders),
      ),
    );

    expect(wrongRoleExit._tag).toBe("Failure");

    const malformedExit = await Effect.runPromiseExit(
      client.resolveStudentQrIdentity({ qrIdentity: "not-a-student-qr" }).pipe(
        RpcClient.withHeaders(companyHeaders),
      ),
    );

    expect(malformedExit._tag).toBe("Failure");
  });
});
