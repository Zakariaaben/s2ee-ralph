import { makeAuth } from "@project/auth";
import { DB, DBLive } from "@project/db";
import { account, session, user } from "@project/db/schema/auth";
import { company } from "@project/db/schema/company";
import { room } from "@project/db/schema/venue";
import { type UserRoleValue } from "@project/domain";
import { ServerEnv } from "@project/env/server";
import { AppRpc } from "@project/rpc";
import { afterEach, beforeAll, describe, expect, test } from "bun:test";
import { setCookieToHeader } from "better-auth/cookies";
import { Effect, Layer, Redacted } from "effect";
import * as RpcClient from "effect/unstable/rpc/RpcClient";
import { RpcTest } from "effect/unstable/rpc";
import { execFileSync } from "node:child_process";

import { AppRpcLive, AppRpcMiddlewareLive } from "../live";

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

const VenueTestLive = Layer.mergeAll(
  AppRpcLive,
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

const makeAppClient = () =>
  Effect.gen(function*() {
    return yield* RpcTest.makeClient(AppRpc);
  }).pipe(Effect.scoped, Effect.provide(VenueTestLive));

const resetTables = () =>
  Effect.gen(function*() {
    const db = yield* DB;

    yield* Effect.promise(() => db.delete(company).execute());
    yield* Effect.promise(() => db.delete(room).execute());
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

describe("venue rpc", () => {
  test("admin actors can create rooms and list them in the venue state", async () => {
    const headers = await Effect.runPromise(provisionSessionHeaders("admin"));
    const client = await Effect.runPromise(makeAppClient());

    expect(
      await Effect.runPromise(
        client.listVenueRooms().pipe(RpcClient.withHeaders(headers)),
      ),
    ).toEqual([]);

    const createdRoom = await Effect.runPromise(
      client.createRoom({ code: "S27" }).pipe(RpcClient.withHeaders(headers)),
    );

    expect(createdRoom.code).toBe("S27");

    expect(
      await Effect.runPromise(
        client.listVenueRooms().pipe(RpcClient.withHeaders(headers)),
      ),
    ).toEqual([
      {
        id: createdRoom.id,
        code: "S27",
        companies: [],
      },
    ]);
  });

  test("admin actors can place companies into rooms while not-arrived companies stay visible", async () => {
    const adminHeaders = await Effect.runPromise(provisionSessionHeaders("admin"));
    const companyHeaders = await Effect.runPromise(provisionSessionHeaders("company"));
    const client = await Effect.runPromise(makeAppClient());

    const room = await Effect.runPromise(
      client.createRoom({ code: "CP3" }).pipe(RpcClient.withHeaders(adminHeaders)),
    );

    const companyProfile = await Effect.runPromise(
      client.upsertCompanyProfile({ name: "Acme Systems" }).pipe(
        RpcClient.withHeaders(companyHeaders),
      ),
    );

    await Effect.runPromise(
      client.assignCompanyPlacement({
        companyId: companyProfile.id,
        roomId: room.id,
        standNumber: 12,
      }).pipe(RpcClient.withHeaders(adminHeaders)),
    );

    expect(
      await Effect.runPromise(
        client.listVenueRooms().pipe(RpcClient.withHeaders(adminHeaders)),
      ),
    ).toEqual([
      {
        id: room.id,
        code: "CP3",
        companies: [
          {
            companyId: companyProfile.id,
            companyName: "Acme Systems",
            standNumber: 12,
            arrivalStatus: "not-arrived",
          },
        ],
      },
    ]);
  });

  test("check-in actors can mark placed companies as arrived", async () => {
    const adminHeaders = await Effect.runPromise(provisionSessionHeaders("admin"));
    const companyHeaders = await Effect.runPromise(provisionSessionHeaders("company"));
    const checkInHeaders = await Effect.runPromise(provisionSessionHeaders("check-in"));
    const client = await Effect.runPromise(makeAppClient());

    const room = await Effect.runPromise(
      client.createRoom({ code: "A1" }).pipe(RpcClient.withHeaders(adminHeaders)),
    );

    const companyProfile = await Effect.runPromise(
      client.upsertCompanyProfile({ name: "Beta Systems" }).pipe(
        RpcClient.withHeaders(companyHeaders),
      ),
    );

    await Effect.runPromise(
      client.assignCompanyPlacement({
        companyId: companyProfile.id,
        roomId: room.id,
        standNumber: 4,
      }).pipe(RpcClient.withHeaders(adminHeaders)),
    );

    const wrongRoleExit = await Effect.runPromiseExit(
      client.markCompanyArrived({ companyId: companyProfile.id }).pipe(
        RpcClient.withHeaders(companyHeaders),
      ),
    );

    expect(wrongRoleExit._tag).toBe("Failure");

    const arrivedCompany = await Effect.runPromise(
      client.markCompanyArrived({ companyId: companyProfile.id }).pipe(
        RpcClient.withHeaders(checkInHeaders),
      ),
    );

    expect(arrivedCompany).toEqual({
      companyId: companyProfile.id,
      companyName: "Beta Systems",
      standNumber: 4,
      arrivalStatus: "arrived",
    });

    expect(
      await Effect.runPromise(
        client.listVenueRooms().pipe(RpcClient.withHeaders(checkInHeaders)),
      ),
    ).toEqual([
      {
        id: room.id,
        code: "A1",
        companies: [
          {
            companyId: companyProfile.id,
            companyName: "Beta Systems",
            standNumber: 4,
            arrivalStatus: "arrived",
          },
        ],
      },
    ]);
  });
});
