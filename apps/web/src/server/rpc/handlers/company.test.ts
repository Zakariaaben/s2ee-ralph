import { makeAuth } from "@project/auth";
import { DB, DBLive } from "@project/db";
import { account, session, user } from "@project/db/schema/auth";
import { company as companyTable, recruiter } from "@project/db/schema/company";
import { ServerEnv } from "@project/env/server";
import { CompanyRpcGroup } from "@project/rpc";
import { afterEach, beforeAll, describe, expect, test } from "bun:test";
import { setCookieToHeader } from "better-auth/cookies";
import { Effect, Layer, Redacted } from "effect";
import * as RpcClient from "effect/unstable/rpc/RpcClient";
import { RpcTest } from "effect/unstable/rpc";
import { execFileSync } from "node:child_process";

import { AppRpcMiddlewareLive, CompanyRpcLive } from "../live";

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

const CompanyTestLive = Layer.mergeAll(
  CompanyRpcLive,
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

const makeCompanyClient = () =>
  Effect.gen(function*() {
    return yield* RpcTest.makeClient(CompanyRpcGroup);
  }).pipe(Effect.scoped, Effect.provide(CompanyTestLive));

const resetTables = () =>
  Effect.gen(function*() {
    const db = yield* DB;

    yield* Effect.promise(() => db.delete(recruiter).execute());
    yield* Effect.promise(() => db.delete(companyTable).execute());
    yield* Effect.promise(() => db.delete(session).execute());
    yield* Effect.promise(() => db.delete(account).execute());
    yield* Effect.promise(() => db.delete(user).execute());
  }).pipe(Effect.provide(DatabaseTestLive));

const provisionCompanySessionHeaders = () =>
  Effect.gen(function*() {
    const auth = yield* makeAuth;
    const authContext = yield* Effect.promise(() => auth.$context);
    const password = "password-123456";
    const email = `company-${Date.now()}@example.com`;
    const passwordHash = yield* Effect.promise(() => authContext.password.hash(password));
    const createdUser = yield* Effect.promise(() =>
      authContext.internalAdapter.createUser({
        email,
        name: "company actor",
        role: "company",
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

describe("company rpc", () => {
  test("company actors can create and read back their onboarding record", async () => {
    const headers = await Effect.runPromise(provisionCompanySessionHeaders());
    const client = await Effect.runPromise(makeCompanyClient());

    const before = await Effect.runPromise(
      client.currentCompany().pipe(
        RpcClient.withHeaders(headers),
      ),
    );

    expect(before).toBeNull();

    const company = await Effect.runPromise(
      client.upsertCompanyProfile({ name: "Acme Systems" }).pipe(
        RpcClient.withHeaders(headers),
      ),
    );

    expect(company.name).toBe("Acme Systems");
    expect(company.recruiters).toEqual([]);

    const after = await Effect.runPromise(
      client.currentCompany().pipe(
        RpcClient.withHeaders(headers),
      ),
    );

    expect(after).toEqual(company);
  });

  test("recruiter roster updates stay scoped to the owning company account", async () => {
    const headers = await Effect.runPromise(provisionCompanySessionHeaders());
    const otherHeaders = await Effect.runPromise(provisionCompanySessionHeaders());
    const client = await Effect.runPromise(makeCompanyClient());

    await Effect.runPromise(
      client.upsertCompanyProfile({ name: "Acme Systems" }).pipe(
        RpcClient.withHeaders(headers),
      ),
    );

    const withRecruiter = await Effect.runPromise(
      client.addRecruiter({ name: "Nora Recruiter" }).pipe(
        RpcClient.withHeaders(headers),
      ),
    );

    const renamed = await Effect.runPromise(
      client.renameRecruiter({
        recruiterId: withRecruiter.recruiters[0]!.id,
        name: "Nora Updated",
      }).pipe(RpcClient.withHeaders(headers)),
    );

    expect(renamed.recruiters).toEqual([
      {
        id: withRecruiter.recruiters[0]!.id,
        name: "Nora Updated",
      },
    ]);

    await Effect.runPromise(
      client.upsertCompanyProfile({ name: "Beta Systems" }).pipe(
        RpcClient.withHeaders(otherHeaders),
      ),
    );

    const foreignRenameExit = await Effect.runPromiseExit(
      client.renameRecruiter({
        recruiterId: withRecruiter.recruiters[0]!.id,
        name: "Wrong Company Update",
      }).pipe(RpcClient.withHeaders(otherHeaders)),
    );

    expect(foreignRenameExit._tag).toBe("Failure");

    const afterForeignAttempt = await Effect.runPromise(
      client.currentCompany().pipe(
        RpcClient.withHeaders(headers),
      ),
    );

    expect(afterForeignAttempt?.recruiters).toEqual([
      {
        id: withRecruiter.recruiters[0]!.id,
        name: "Nora Updated",
      },
    ]);
  });
});
