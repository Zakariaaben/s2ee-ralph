import { account, session, user } from "@project/db/schema/auth";
import { company } from "@project/db/schema/company";
import { room } from "@project/db/schema/venue";
import { CompanyRpcGroup, VenueRpcGroup } from "@project/rpc";
import { afterEach, beforeAll, describe, expect, it } from "@effect/vitest";
import { Effect, Layer } from "effect";
import * as RpcClient from "effect/unstable/rpc/RpcClient";
import { RpcTest } from "effect/unstable/rpc";

import { AppRpcMiddlewareLive, CompanyRpcLive, VenueRpcLive } from "../live";
import {
  getComposeTestInfraAvailability,
  makeRpcTestLive,
  provisionSessionHeaders,
  resetTables,
  startPostgresTestInfra,
  warnComposeTestInfraUnavailable,
} from "../test-support";

const VenueTestLive = makeRpcTestLive(
  CompanyRpcLive,
  VenueRpcLive,
  AppRpcMiddlewareLive,
);

const makeCompanyClient = RpcTest.makeClient(CompanyRpcGroup);

const makeVenueClient = RpcTest.makeClient(VenueRpcGroup);

const postgresTestInfra = getComposeTestInfraAvailability();

if (!postgresTestInfra.available) {
  warnComposeTestInfraUnavailable(postgresTestInfra);
}

afterEach(async () => {
  await Effect.runPromise(resetTables([company, room, session, account, user]));
});

const describeWithPostgres = postgresTestInfra.available ? describe : describe.skip;

describeWithPostgres("venue rpc", () => {
  beforeAll(() => {
    startPostgresTestInfra();
  });

  it.effect("admin actors can create rooms and list them in the venue state after transport decoding", () =>
    Effect.gen(function*() {
      const headers = yield* provisionSessionHeaders("admin");
      const client = yield* makeVenueClient;
      const blankRoomExit = yield* Effect.exit(
        client.createRoom({ code: "   " }).pipe(
          RpcClient.withHeaders(headers),
        ),
      );

      expect(
        yield* client.listVenueRooms().pipe(RpcClient.withHeaders(headers)),
      ).toEqual([]);
      expect(blankRoomExit._tag).toBe("Failure");

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
    }).pipe(Effect.provide(Layer.fresh(VenueTestLive))));

  it.effect(
    "admin actors can place companies into rooms while not-arrived companies stay visible",
    () =>
      Effect.gen(function*() {
        const adminHeaders = yield* provisionSessionHeaders("admin");
        const companyHeaders = yield* provisionSessionHeaders("company");
        const venueClient = yield* makeVenueClient;
        const companyClient = yield* makeCompanyClient;
        const placedRoom = yield* venueClient.createRoom({ code: "CP3" }).pipe(
          RpcClient.withHeaders(adminHeaders),
        );
        const companyProfile = yield* companyClient.upsertCompanyProfile({ name: "Acme Systems" }).pipe(
          RpcClient.withHeaders(companyHeaders),
        );
        const invalidStandExit = yield* Effect.exit(
          venueClient.assignCompanyPlacement({
            companyId: companyProfile.id,
            roomId: placedRoom.id,
            standNumber: 0,
          }).pipe(RpcClient.withHeaders(adminHeaders)),
        );

        yield* venueClient.assignCompanyPlacement({
          companyId: companyProfile.id,
          roomId: placedRoom.id,
          standNumber: 12,
        }).pipe(RpcClient.withHeaders(adminHeaders));

        expect(invalidStandExit._tag).toBe("Failure");

        expect(
          yield* venueClient.listVenueRooms().pipe(
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
      }).pipe(Effect.provide(Layer.fresh(VenueTestLive))),
  );

  it.effect("check-in actors can mark placed companies as arrived", () =>
    Effect.gen(function*() {
      const adminHeaders = yield* provisionSessionHeaders("admin");
      const companyHeaders = yield* provisionSessionHeaders("company");
      const checkInHeaders = yield* provisionSessionHeaders("check-in");
      const venueClient = yield* makeVenueClient;
      const companyClient = yield* makeCompanyClient;
      const placedRoom = yield* venueClient.createRoom({ code: "A1" }).pipe(
        RpcClient.withHeaders(adminHeaders),
      );
      const companyProfile = yield* companyClient.upsertCompanyProfile({ name: "Beta Systems" }).pipe(
        RpcClient.withHeaders(companyHeaders),
      );

      yield* venueClient.assignCompanyPlacement({
        companyId: companyProfile.id,
        roomId: placedRoom.id,
        standNumber: 4,
      }).pipe(RpcClient.withHeaders(adminHeaders));

      const wrongRoleExit = yield* Effect.exit(
        venueClient.markCompanyArrived({ companyId: companyProfile.id }).pipe(
          RpcClient.withHeaders(companyHeaders),
        ),
      );

      expect(wrongRoleExit._tag).toBe("Failure");

      const arrivedCompany = yield* venueClient.markCompanyArrived({
        companyId: companyProfile.id,
      }).pipe(RpcClient.withHeaders(checkInHeaders));

      expect(arrivedCompany).toEqual({
        companyId: companyProfile.id,
        companyName: "Beta Systems",
        standNumber: 4,
        arrivalStatus: "arrived",
      });

      expect(
        yield* venueClient.listVenueRooms().pipe(
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
    }).pipe(Effect.provide(Layer.fresh(VenueTestLive))));
});
