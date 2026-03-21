import { account, session, user } from "@project/db/schema/auth";
import { UserRoleValues } from "@project/domain";
import { ActorRpcGroup } from "@project/rpc";
import { afterEach, beforeAll, describe, expect, it } from "@effect/vitest";
import { Effect } from "effect";
import * as RpcClient from "effect/unstable/rpc/RpcClient";
import { RpcTest } from "effect/unstable/rpc";

import { ActorRpcLive, AppRpcMiddlewareLive } from "../live";
import {
  getComposeTestInfraAvailability,
  makeRpcTestLive,
  provisionSessionHeaders,
  resetTables,
  startPostgresTestInfra,
  warnComposeTestInfraUnavailable,
} from "../test-support";

const ActorTestLive = makeRpcTestLive(
  ActorRpcLive,
  AppRpcMiddlewareLive,
);

const makeActorClient = RpcTest.makeClient(ActorRpcGroup).pipe(
  Effect.provide(ActorTestLive),
);

const postgresTestInfra = getComposeTestInfraAvailability();

if (!postgresTestInfra.available) {
  warnComposeTestInfraUnavailable(postgresTestInfra);
}

afterEach(async () => {
  await Effect.runPromise(resetTables([session, account, user]));
});

const describeWithPostgres = postgresTestInfra.available ? describe : describe.skip;

describeWithPostgres("actor rpc", () => {
  beforeAll(() => {
    startPostgresTestInfra();
  });

  it.effect("resolves the current actor role from the auth session", () =>
    Effect.gen(function*() {
      const headers = yield* provisionSessionHeaders("company");
      const client = yield* makeActorClient;
      const actor = yield* client.currentActor().pipe(
        RpcClient.withHeaders(headers),
      );

      expect(actor.role).toBe("company");
      expect(actor.email).toContain("@example.com");
    }));

  it.effect("rejects unauthenticated actor access", () =>
    Effect.gen(function*() {
      const client = yield* makeActorClient;
      const exit = yield* Effect.exit(client.currentActor());

      expect(exit._tag).toBe("Failure");
    }));

  it.effect("enforces the expected role for protected probes", () =>
    Effect.gen(function*() {
      const client = yield* makeActorClient;

      for (const role of UserRoleValues) {
        const headers = yield* provisionSessionHeaders(role);
        const adminExit = yield* Effect.exit(
          client.requireAdminAccess().pipe(RpcClient.withHeaders(headers)),
        );
        const studentExit = yield* Effect.exit(
          client.requireStudentAccess().pipe(RpcClient.withHeaders(headers)),
        );
        const companyExit = yield* Effect.exit(
          client.requireCompanyAccess().pipe(RpcClient.withHeaders(headers)),
        );
        const checkInExit = yield* Effect.exit(
          client.requireCheckInAccess().pipe(RpcClient.withHeaders(headers)),
        );

        expect(adminExit._tag).toBe(role === "admin" ? "Success" : "Failure");
        expect(studentExit._tag).toBe(role === "student" ? "Success" : "Failure");
        expect(companyExit._tag).toBe(role === "company" ? "Success" : "Failure");
        expect(checkInExit._tag).toBe(role === "check-in" ? "Success" : "Failure");
      }
    }));
});
