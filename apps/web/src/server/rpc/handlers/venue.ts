import { CurrentActor, PublicVenueRpcGroup, VenueRpcGroup } from "@project/rpc";
import { Effect } from "effect";

import { VenueService } from "../../services/venue-service";

export const makeVenueRpcHandlers = Effect.gen(function*() {
  const venueService = yield* VenueService;

  return VenueRpcGroup.of({
    listVenueRooms: () =>
      Effect.gen(function*() {
        const actor = yield* CurrentActor;

        return yield* venueService.listVenueRooms(actor);
      }),
    publishVenueMap: (input) =>
      Effect.gen(function*() {
        const actor = yield* CurrentActor;

        return yield* venueService.publishVenueMap({
          actor,
          fileName: input.fileName,
          contentType: input.contentType,
          contentsBase64: input.contentsBase64,
        });
      }),
    clearPublishedVenueMap: () =>
      Effect.gen(function*() {
        const actor = yield* CurrentActor;

        return yield* venueService.clearPublishedVenueMap(actor);
      }),
    upsertVenueMapRoomPin: (input) =>
      Effect.gen(function*() {
        const actor = yield* CurrentActor;

        return yield* venueService.upsertVenueMapRoomPin({
          actor,
          roomId: input.roomId,
          xPercent: input.xPercent,
          yPercent: input.yPercent,
        });
      }),
    deleteVenueMapRoomPin: (input) =>
      Effect.gen(function*() {
        const actor = yield* CurrentActor;

        return yield* venueService.deleteVenueMapRoomPin({
          actor,
          roomId: input.roomId,
        });
      }),
    createRoom: (input) =>
      Effect.gen(function*() {
        const actor = yield* CurrentActor;

        return yield* venueService.createRoom({
          actor,
          code: input.code,
        });
      }),
    updateRoom: (input) =>
      Effect.gen(function*() {
        const actor = yield* CurrentActor;

        return yield* venueService.updateRoom({
          actor,
          roomId: input.roomId,
          code: input.code,
        });
      }),
    deleteRoom: (input) =>
      Effect.gen(function*() {
        const actor = yield* CurrentActor;

        return yield* venueService.deleteRoom({
          actor,
          roomId: input.roomId,
        });
      }),
    assignCompanyPlacement: (input) =>
      Effect.gen(function*() {
        const actor = yield* CurrentActor;

        return yield* venueService.assignCompanyPlacement({
          actor,
          companyId: input.companyId,
          roomId: input.roomId,
          standNumber: input.standNumber,
        });
      }),
    clearCompanyPlacement: (input) =>
      Effect.gen(function*() {
        const actor = yield* CurrentActor;

        return yield* venueService.clearCompanyPlacement({
          actor,
          companyId: input.companyId,
        });
      }),
    markCompanyArrived: (input) =>
      Effect.gen(function*() {
        const actor = yield* CurrentActor;

        return yield* venueService.markCompanyArrived({
          actor,
          companyId: input.companyId,
        });
      }),
  });
});

export const makePublicVenueRpcHandlers = Effect.gen(function*() {
  const venueService = yield* VenueService;

  return PublicVenueRpcGroup.of({
    getPublishedVenueMap: () =>
      Effect.gen(function*() {
        return yield* venueService.getPublishedVenueMap();
      }),
  });
});
