import { type AuthenticatedActor, type Room, type VenueCompany, type VenueRoom } from "@project/domain";
import { Effect, Layer, ServiceMap } from "effect";
import * as HttpApiError from "effect/unstable/httpapi/HttpApiError";

import { VenueRepository } from "../repositories/venue-repository";

const requireAdminActor = (actor: AuthenticatedActor) =>
  Effect.gen(function*() {
    if (actor.role !== "admin") {
      yield* new HttpApiError.Forbidden({});
    }

    return actor;
  });

const requireCheckInActor = (actor: AuthenticatedActor) =>
  Effect.gen(function*() {
    if (actor.role !== "check-in") {
      yield* new HttpApiError.Forbidden({});
    }

    return actor;
  });

export class VenueService extends ServiceMap.Service<
  VenueService,
  {
    readonly listVenueRooms: (
      actor: AuthenticatedActor,
    ) => Effect.Effect<ReadonlyArray<VenueRoom>>;
    readonly createRoom: (
      input: {
        readonly actor: AuthenticatedActor;
        readonly code: string;
      },
    ) => Effect.Effect<Room, HttpApiError.Forbidden>;
    readonly assignCompanyPlacement: (
      input: {
        readonly actor: AuthenticatedActor;
        readonly companyId: string;
        readonly roomId: string;
        readonly standNumber: number;
      },
    ) => Effect.Effect<
      VenueCompany,
      HttpApiError.Forbidden | HttpApiError.NotFound
    >;
    readonly markCompanyArrived: (
      input: {
        readonly actor: AuthenticatedActor;
        readonly companyId: string;
      },
    ) => Effect.Effect<VenueCompany, HttpApiError.Forbidden | HttpApiError.NotFound>;
  }
>()("@project/web/VenueService") {
  static readonly layer = Layer.effect(
    VenueService,
    Effect.gen(function*() {
      const venueRepository = yield* VenueRepository;

      return VenueService.of({
        listVenueRooms: (actor) =>
          Effect.gen(function*() {
            void actor;

            return yield* venueRepository.listRooms();
          }),
        createRoom: ({ actor, code }) =>
          Effect.gen(function*() {
            yield* requireAdminActor(actor);

            return yield* venueRepository.createRoom({
              code,
            });
          }),
        assignCompanyPlacement: ({ actor, companyId, roomId, standNumber }) =>
          Effect.gen(function*() {
            yield* requireAdminActor(actor);
            const placedCompany = yield* venueRepository.assignCompanyPlacement({
              companyId,
              roomId,
              standNumber,
            });

            if (!placedCompany) {
              return yield* Effect.fail(new HttpApiError.NotFound({}));
            }

            return placedCompany;
          }),
        markCompanyArrived: ({ actor, companyId }) =>
          Effect.gen(function*() {
            yield* requireCheckInActor(actor);

            const arrivedCompany = yield* venueRepository.markCompanyArrived({
              companyId,
            });

            if (!arrivedCompany) {
              return yield* Effect.fail(new HttpApiError.NotFound({}));
            }

            return arrivedCompany;
          }),
      });
    }),
  ).pipe(Layer.provide(VenueRepository.layer));
}
