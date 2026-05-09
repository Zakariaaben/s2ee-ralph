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
    createRoom: (input) =>
      Effect.gen(function*() {
        const actor = yield* CurrentActor;

        return yield* venueService.createRoom({
          actor,
          code: input.code,
          zoneId: input.zoneId,
        });
      }),
    updateRoom: (input) =>
      Effect.gen(function*() {
        const actor = yield* CurrentActor;

        return yield* venueService.updateRoom({
          actor,
          roomId: input.roomId,
          code: input.code,
          zoneId: input.zoneId,
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
    markCompanyArrived: (input) =>
      Effect.gen(function*() {
        const actor = yield* CurrentActor;

        return yield* venueService.markCompanyArrived({
          actor,
          companyId: input.companyId,
        });
      }),
    resetCompanyArrival: (input) =>
      Effect.gen(function*() {
        const actor = yield* CurrentActor;

        return yield* venueService.resetCompanyArrival({
          actor,
          companyId: input.companyId,
        });
      }),
  });
});

export const makePublicVenueRpcHandlers = Effect.gen(function*() {
  const venueService = yield* VenueService;

  return PublicVenueRpcGroup.of({
    listPublicVenueZones: () => venueService.listPublicZones(),
    listPublicVenueCompanies: () => venueService.listPublicCompanies(),
  });
});
