import { account, session, user } from "@project/db/schema/auth";
import { company } from "@project/db/schema/company";
import { room } from "@project/db/schema/venue";
import { AppRpc } from "@project/rpc";
import { afterEach, beforeAll, describe, expect, it } from "@effect/vitest";
import { Effect } from "effect";
import * as RpcClient from "effect/unstable/rpc/RpcClient";
import { RpcTest } from "effect/unstable/rpc";

import { AppRpcLive, AppRpcMiddlewareLive } from "../live";
import {
  makeRpcTestLive,
  provisionSessionHeaders,
  resetTables,
  startPostgresTestInfra,
} from "../test-support";

const VenueTestLive = makeRpcTestLive(
  AppRpcLive,
  AppRpcMiddlewareLive,
);

const makeAppClient = RpcTest.makeClient(AppRpc).pipe(
  Effect.provide(VenueTestLive),
);

beforeAll(() => {
  startPostgresTestInfra();
});

afterEach(async () => {
  await Effect.runPromise(resetTables([company, room, session, account, user]));
});

describe("venue rpc", () => {
  it.effect("admin actors can create rooms and list them in the venue state", () =>
    Effect.gen(function*() {
      const headers = yield* provisionSessionHeaders("admin");
      const client = yield* makeAppClient;

      expect(
        yield* client.listVenueRooms().pipe(RpcClient.withHeaders(headers)),
      ).toEqual([]);

      const createdRoom = yield* client.createRoom({ code: "S27" }).pipe(
        RpcClient.withHeaders(headers),
      );

      expect(createdRoom.code).toBe("S27");
      expect(
        yield* client.listVenueRooms().pipe(RpcClient.withHeaders(headers)),
      ).toEqual([
        {
          id: createdRoom.id,
          code: "S27",
          companies: [],
        },
      ]);
    }));

  it.effect(
    "admin actors can place companies into rooms while not-arrived companies stay visible",
    () =>
      Effect.gen(function*() {
        const adminHeaders = yield* provisionSessionHeaders("admin");
        const companyHeaders = yield* provisionSessionHeaders("company");
        const client = yield* makeAppClient;
        const placedRoom = yield* client.createRoom({ code: "CP3" }).pipe(
          RpcClient.withHeaders(adminHeaders),
        );
        const companyProfile = yield* client.upsertCompanyProfile({ name: "Acme Systems" }).pipe(
          RpcClient.withHeaders(companyHeaders),
        );

        yield* client.assignCompanyPlacement({
          companyId: companyProfile.id,
          roomId: placedRoom.id,
          standNumber: 12,
        }).pipe(RpcClient.withHeaders(adminHeaders));

        expect(
          yield* client.listVenueRooms().pipe(
            RpcClient.withHeaders(adminHeaders),
          ),
        ).toEqual([
          {
            id: placedRoom.id,
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
      }),
  );

  it.effect("check-in actors can mark placed companies as arrived", () =>
    Effect.gen(function*() {
      const adminHeaders = yield* provisionSessionHeaders("admin");
      const companyHeaders = yield* provisionSessionHeaders("company");
      const checkInHeaders = yield* provisionSessionHeaders("check-in");
      const client = yield* makeAppClient;
      const placedRoom = yield* client.createRoom({ code: "A1" }).pipe(
        RpcClient.withHeaders(adminHeaders),
      );
      const companyProfile = yield* client.upsertCompanyProfile({ name: "Beta Systems" }).pipe(
        RpcClient.withHeaders(companyHeaders),
      );

      yield* client.assignCompanyPlacement({
        companyId: companyProfile.id,
        roomId: placedRoom.id,
        standNumber: 4,
      }).pipe(RpcClient.withHeaders(adminHeaders));

      const wrongRoleExit = yield* Effect.exit(
        client.markCompanyArrived({ companyId: companyProfile.id }).pipe(
          RpcClient.withHeaders(companyHeaders),
        ),
      );

      expect(wrongRoleExit._tag).toBe("Failure");

      const arrivedCompany = yield* client.markCompanyArrived({
        companyId: companyProfile.id,
      }).pipe(RpcClient.withHeaders(checkInHeaders));

      expect(arrivedCompany).toEqual({
        companyId: companyProfile.id,
        companyName: "Beta Systems",
        standNumber: 4,
        arrivalStatus: "arrived",
      });

      expect(
        yield* client.listVenueRooms().pipe(
          RpcClient.withHeaders(checkInHeaders),
        ),
      ).toEqual([
        {
          id: placedRoom.id,
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
    }));
});
