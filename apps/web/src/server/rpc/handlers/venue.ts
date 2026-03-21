import { CurrentActor, VenueRpcGroup } from "@project/rpc";
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
