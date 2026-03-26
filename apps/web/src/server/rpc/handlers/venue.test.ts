import { account, session, user } from "@project/db/schema/auth";
import { company } from "@project/db/schema/company";
import { publishedVenueMap, publishedVenueMapPin, room } from "@project/db/schema/venue";
import { AdminRpcGroup, CompanyRpcGroup, PublicVenueRpcGroup, VenueRpcGroup } from "@project/rpc";
import { afterEach, beforeAll, describe, expect, it } from "@effect/vitest";
import { Effect, Layer } from "effect";
import * as RpcClient from "effect/unstable/rpc/RpcClient";
import { RpcTest } from "effect/unstable/rpc";

import {
  AdminRpcLive,
  AppRpcMiddlewareLive,
  CompanyRpcLive,
  PublicVenueRpcLive,
  VenueRpcLive,
} from "../live";
import {
  getComposeTestInfraAvailability,
  makeRpcTestLive,
  provisionSessionHeaders,
  resetTables,
  startPostgresTestInfra,
  warnComposeTestInfraUnavailable,
} from "../test-support";

const VenueTestLive = makeRpcTestLive(
  AdminRpcLive,
  CompanyRpcLive,
  PublicVenueRpcLive,
  VenueRpcLive,
  AppRpcMiddlewareLive,
);

const makeAdminClient = RpcTest.makeClient(AdminRpcGroup);

const makeCompanyClient = RpcTest.makeClient(CompanyRpcGroup);

const makeVenueClient = RpcTest.makeClient(VenueRpcGroup);

const makePublicVenueClient = RpcTest.makeClient(PublicVenueRpcGroup);

const postgresTestInfra = getComposeTestInfraAvailability();

if (!postgresTestInfra.available) {
  warnComposeTestInfraUnavailable(postgresTestInfra);
}

afterEach(async () => {
  await Effect.runPromise(
    resetTables([publishedVenueMapPin, publishedVenueMap, company, room, session, account, user]),
  );
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
    "admin actors can publish a venue map and expose room-linked pins through the public venue contract",
    () =>
      Effect.gen(function*() {
        const adminHeaders = yield* provisionSessionHeaders("admin");
        const companyHeaders = yield* provisionSessionHeaders("company");
        const venueClient = yield* makeVenueClient;
        const companyClient = yield* makeCompanyClient;
        const publicVenueClient = yield* makePublicVenueClient;
        const createdRoom = yield* venueClient.createRoom({ code: "A1" }).pipe(
          RpcClient.withHeaders(adminHeaders),
        );
        const companyProfile = yield* companyClient.upsertCompanyProfile({ name: "Acme Systems" }).pipe(
          RpcClient.withHeaders(companyHeaders),
        );

        yield* venueClient.assignCompanyPlacement({
          companyId: companyProfile.id,
          roomId: createdRoom.id,
          standNumber: 8,
        }).pipe(RpcClient.withHeaders(adminHeaders));
        yield* venueClient.publishVenueMap({
          fileName: "venue-map.png",
          contentType: "image/png",
          contentsBase64: "aGVsbG8=",
        }).pipe(RpcClient.withHeaders(adminHeaders));

        const publishedMap = yield* venueClient.upsertVenueMapRoomPin({
          roomId: createdRoom.id,
          xPercent: 42.5,
          yPercent: 18.75,
        }).pipe(RpcClient.withHeaders(adminHeaders));

        expect(publishedMap).toEqual({
          image: {
            fileName: "venue-map.png",
            contentType: "image/png",
            contentsBase64: "aGVsbG8=",
          },
          pins: [
            {
              room: {
                id: createdRoom.id,
                code: "A1",
                companies: [
                  {
                    companyId: companyProfile.id,
                    companyName: "Acme Systems",
                    standNumber: 8,
                    arrivalStatus: "not-arrived",
                  },
                ],
              },
              xPercent: 42.5,
              yPercent: 18.75,
            },
          ],
        });

        expect(yield* publicVenueClient.getPublishedVenueMap()).toEqual(publishedMap);
      }).pipe(Effect.provide(Layer.fresh(VenueTestLive))),
  );

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

  it.effect("admin actors can reset an arrived company back to pending", () =>
    Effect.gen(function*() {
      const adminHeaders = yield* provisionSessionHeaders("admin");
      const companyHeaders = yield* provisionSessionHeaders("company");
      const checkInHeaders = yield* provisionSessionHeaders("check-in");
      const venueClient = yield* makeVenueClient;
      const companyClient = yield* makeCompanyClient;
      const placedRoom = yield* venueClient.createRoom({ code: "B2" }).pipe(
        RpcClient.withHeaders(adminHeaders),
      );
      const companyProfile = yield* companyClient.upsertCompanyProfile({ name: "Northwind Works" }).pipe(
        RpcClient.withHeaders(companyHeaders),
      );

      yield* venueClient.assignCompanyPlacement({
        companyId: companyProfile.id,
        roomId: placedRoom.id,
        standNumber: 8,
      }).pipe(RpcClient.withHeaders(adminHeaders));
      yield* venueClient.markCompanyArrived({
        companyId: companyProfile.id,
      }).pipe(RpcClient.withHeaders(checkInHeaders));

      const wrongRoleExit = yield* Effect.exit(
        venueClient.resetCompanyArrival({ companyId: companyProfile.id }).pipe(
          RpcClient.withHeaders(companyHeaders),
        ),
      );

      expect(wrongRoleExit._tag).toBe("Failure");

      const resetCompany = yield* venueClient.resetCompanyArrival({
        companyId: companyProfile.id,
      }).pipe(RpcClient.withHeaders(adminHeaders));

      expect(resetCompany).toEqual({
        companyId: companyProfile.id,
        companyName: "Northwind Works",
        standNumber: 8,
        arrivalStatus: "not-arrived",
      });

      expect(
        yield* venueClient.listVenueRooms().pipe(
          RpcClient.withHeaders(adminHeaders),
        ),
      ).toEqual([
        {
          id: placedRoom.id,
          code: "B2",
          companies: [
            {
              companyId: companyProfile.id,
              companyName: "Northwind Works",
              standNumber: 8,
              arrivalStatus: "not-arrived",
            },
          ],
        },
      ]);
    }).pipe(Effect.provide(Layer.fresh(VenueTestLive))));

  it.effect("check-in actors can undo a recent arrival mark back to pending", () =>
    Effect.gen(function*() {
      const adminHeaders = yield* provisionSessionHeaders("admin");
      const companyHeaders = yield* provisionSessionHeaders("company");
      const checkInHeaders = yield* provisionSessionHeaders("check-in");
      const venueClient = yield* makeVenueClient;
      const companyClient = yield* makeCompanyClient;
      const placedRoom = yield* venueClient.createRoom({ code: "C4" }).pipe(
        RpcClient.withHeaders(adminHeaders),
      );
      const companyProfile = yield* companyClient.upsertCompanyProfile({ name: "Atlas Systems" }).pipe(
        RpcClient.withHeaders(companyHeaders),
      );

      yield* venueClient.assignCompanyPlacement({
        companyId: companyProfile.id,
        roomId: placedRoom.id,
        standNumber: 11,
      }).pipe(RpcClient.withHeaders(adminHeaders));
      yield* venueClient.markCompanyArrived({
        companyId: companyProfile.id,
      }).pipe(RpcClient.withHeaders(checkInHeaders));

      const resetCompany = yield* venueClient.resetCompanyArrival({
        companyId: companyProfile.id,
      }).pipe(RpcClient.withHeaders(checkInHeaders));

      expect(resetCompany).toEqual({
        companyId: companyProfile.id,
        companyName: "Atlas Systems",
        standNumber: 11,
        arrivalStatus: "not-arrived",
      });
    }).pipe(Effect.provide(Layer.fresh(VenueTestLive))));

  it.effect(
    "admin actors can rename rooms, clear placements, and delete rooms while venue and admin ledgers stay coherent",
    () =>
      Effect.gen(function*() {
        const adminHeaders = yield* provisionSessionHeaders("admin");
        const companyHeaders = yield* provisionSessionHeaders("company");
        const companyHeadersTwo = yield* provisionSessionHeaders("company");
        const venueClient = yield* makeVenueClient;
        const companyClient = yield* makeCompanyClient;
        const adminClient = yield* makeAdminClient;
        const roomToKeep = yield* venueClient.createRoom({ code: "CP3" }).pipe(
          RpcClient.withHeaders(adminHeaders),
        );
        const roomToDelete = yield* venueClient.createRoom({ code: "S27" }).pipe(
          RpcClient.withHeaders(adminHeaders),
        );
        const acme = yield* companyClient.upsertCompanyProfile({ name: "Acme Systems" }).pipe(
          RpcClient.withHeaders(companyHeaders),
        );
        const globex = yield* companyClient.upsertCompanyProfile({ name: "Globex" }).pipe(
          RpcClient.withHeaders(companyHeadersTwo),
        );

        yield* venueClient.assignCompanyPlacement({
          companyId: acme.id,
          roomId: roomToKeep.id,
          standNumber: 12,
        }).pipe(RpcClient.withHeaders(adminHeaders));
        yield* venueClient.assignCompanyPlacement({
          companyId: globex.id,
          roomId: roomToDelete.id,
          standNumber: 7,
        }).pipe(RpcClient.withHeaders(adminHeaders));

        const renamedRoom = yield* venueClient.updateRoom({
          roomId: roomToKeep.id,
          code: "CP4",
        }).pipe(RpcClient.withHeaders(adminHeaders));

        yield* venueClient.clearCompanyPlacement({
          companyId: acme.id,
        }).pipe(RpcClient.withHeaders(adminHeaders));
        yield* venueClient.deleteRoom({
          roomId: roomToDelete.id,
        }).pipe(RpcClient.withHeaders(adminHeaders));

        expect(renamedRoom).toEqual({
          id: roomToKeep.id,
          code: "CP4",
        });
        expect(
          yield* venueClient.listVenueRooms().pipe(
            RpcClient.withHeaders(adminHeaders),
          ),
        ).toEqual([
          {
            id: roomToKeep.id,
            code: "CP4",
            companies: [],
          },
        ]);
        expect(
          yield* adminClient.listAdminCompanyLedger().pipe(
            RpcClient.withHeaders(adminHeaders),
          ),
        ).toEqual([
          {
            company: acme,
            room: null,
            standNumber: null,
            arrivalStatus: "not-arrived",
          },
          {
            company: globex,
            room: null,
            standNumber: null,
            arrivalStatus: "not-arrived",
          },
        ]);
      }).pipe(Effect.provide(Layer.fresh(VenueTestLive))),
  );

  it.effect(
    "non-admin actors cannot rename rooms, clear placements, or delete rooms",
    () =>
      Effect.gen(function*() {
        const adminHeaders = yield* provisionSessionHeaders("admin");
        const companyHeaders = yield* provisionSessionHeaders("company");
        const venueClient = yield* makeVenueClient;
        const companyClient = yield* makeCompanyClient;
        const createdRoom = yield* venueClient.createRoom({ code: "A1" }).pipe(
          RpcClient.withHeaders(adminHeaders),
        );
        const companyProfile = yield* companyClient.upsertCompanyProfile({ name: "Acme Systems" }).pipe(
          RpcClient.withHeaders(companyHeaders),
        );

        yield* venueClient.assignCompanyPlacement({
          companyId: companyProfile.id,
          roomId: createdRoom.id,
          standNumber: 3,
        }).pipe(RpcClient.withHeaders(adminHeaders));

        const renameExit = yield* Effect.exit(
          venueClient.updateRoom({
            roomId: createdRoom.id,
            code: "A2",
          }).pipe(RpcClient.withHeaders(companyHeaders)),
        );
        const clearExit = yield* Effect.exit(
          venueClient.clearCompanyPlacement({
            companyId: companyProfile.id,
          }).pipe(RpcClient.withHeaders(companyHeaders)),
        );
        const deleteExit = yield* Effect.exit(
          venueClient.deleteRoom({
            roomId: createdRoom.id,
          }).pipe(RpcClient.withHeaders(companyHeaders)),
        );

        expect(renameExit._tag).toBe("Failure");
        expect(clearExit._tag).toBe("Failure");
        expect(deleteExit._tag).toBe("Failure");
        expect(
          yield* venueClient.listVenueRooms().pipe(
            RpcClient.withHeaders(adminHeaders),
          ),
        ).toEqual([
          {
            id: createdRoom.id,
            code: "A1",
            companies: [
              {
                companyId: companyProfile.id,
                companyName: "Acme Systems",
                standNumber: 3,
                arrivalStatus: "not-arrived",
              },
            ],
          },
        ]);
      }).pipe(Effect.provide(Layer.fresh(VenueTestLive))),
  );

  it.effect("non-admin actors cannot publish venue maps or modify room pins", () =>
    Effect.gen(function*() {
      const adminHeaders = yield* provisionSessionHeaders("admin");
      const companyHeaders = yield* provisionSessionHeaders("company");
      const venueClient = yield* makeVenueClient;
      const createdRoom = yield* venueClient.createRoom({ code: "A1" }).pipe(
        RpcClient.withHeaders(adminHeaders),
      );

      const publishExit = yield* Effect.exit(
        venueClient.publishVenueMap({
          fileName: "venue-map.png",
          contentType: "image/png",
          contentsBase64: "aGVsbG8=",
        }).pipe(RpcClient.withHeaders(companyHeaders)),
      );
      const pinExit = yield* Effect.exit(
        venueClient.upsertVenueMapRoomPin({
          roomId: createdRoom.id,
          xPercent: 10,
          yPercent: 20,
        }).pipe(RpcClient.withHeaders(companyHeaders)),
      );

      expect(publishExit._tag).toBe("Failure");
      expect(pinExit._tag).toBe("Failure");
      expect(yield* (yield* makePublicVenueClient).getPublishedVenueMap()).toBeNull();
    }).pipe(Effect.provide(Layer.fresh(VenueTestLive))));
});
