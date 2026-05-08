import {
  type AdminCompanyLedgerEntry,
  type AuthenticatedActor,
  type Room,
  type VenueCompany,
  type VenueRoom,
  type Zone,
} from "@project/domain";
import { Effect, Layer, ServiceMap } from "effect";
import * as HttpApiError from "effect/unstable/httpapi/HttpApiError";

import { AdminRepository } from "../repositories/admin-repository";
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

const requireAdminOrCheckInActor = (actor: AuthenticatedActor) =>
  Effect.gen(function*() {
    if (actor.role !== "admin" && actor.role !== "check-in") {
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
        readonly zoneId?: string;
      },
    ) => Effect.Effect<Room, HttpApiError.Forbidden>;
    readonly updateRoom: (
      input: {
        readonly actor: AuthenticatedActor;
        readonly roomId: string;
        readonly code: string;
        readonly zoneId?: string;
      },
    ) => Effect.Effect<
      Room,
      HttpApiError.Forbidden | HttpApiError.NotFound
    >;
    readonly deleteRoom: (
      input: {
        readonly actor: AuthenticatedActor;
        readonly roomId: string;
      },
    ) => Effect.Effect<
      Room,
      HttpApiError.Forbidden | HttpApiError.NotFound
    >;
    readonly markCompanyArrived: (
      input: {
        readonly actor: AuthenticatedActor;
        readonly companyId: string;
      },
    ) => Effect.Effect<VenueCompany, HttpApiError.Forbidden | HttpApiError.NotFound>;
    readonly resetCompanyArrival: (
      input: {
        readonly actor: AuthenticatedActor;
        readonly companyId: string;
      },
    ) => Effect.Effect<VenueCompany, HttpApiError.Forbidden | HttpApiError.NotFound>;
    readonly listPublicZones: () => Effect.Effect<ReadonlyArray<Zone>>;
    readonly listPublicCompanies: () => Effect.Effect<ReadonlyArray<AdminCompanyLedgerEntry>>;
  }
>()("@project/web/VenueService") {
  static readonly layer = Layer.effect(
    VenueService,
    Effect.gen(function*() {
      const venueRepository = yield* VenueRepository;
      const adminRepository = yield* AdminRepository;

      return VenueService.of({
        listVenueRooms: (actor) =>
          Effect.gen(function*() {
            void actor;

            return yield* venueRepository.listRooms();
          }),
        createRoom: ({ actor, code, zoneId }) =>
          Effect.gen(function*() {
            yield* requireAdminActor(actor);

            return yield* venueRepository.createRoom({
              code,
              zoneId,
            });
          }),
        updateRoom: ({ actor, roomId, code, zoneId }) =>
          Effect.gen(function*() {
            yield* requireAdminActor(actor);

            const updatedRoom = yield* venueRepository.updateRoom({
              roomId,
              code,
              zoneId,
            });

            if (!updatedRoom) {
              return yield* Effect.fail(new HttpApiError.NotFound({}));
            }

            return updatedRoom;
          }),
        deleteRoom: ({ actor, roomId }) =>
          Effect.gen(function*() {
            yield* requireAdminActor(actor);

            const deletedRoom = yield* venueRepository.deleteRoom({
              roomId,
            });

            if (!deletedRoom) {
              return yield* Effect.fail(new HttpApiError.NotFound({}));
            }

            return deletedRoom;
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
        resetCompanyArrival: ({ actor, companyId }) =>
          Effect.gen(function*() {
            yield* requireAdminOrCheckInActor(actor);

            const resetCompany = yield* venueRepository.resetCompanyArrival({
              companyId,
            });

            if (!resetCompany) {
              return yield* Effect.fail(new HttpApiError.NotFound({}));
            }

            return resetCompany;
          }),
        listPublicZones: () => adminRepository.listZones(),
        listPublicCompanies: () => adminRepository.listCompanyLedger(),
      });
    }),
  ).pipe(Layer.provide(Layer.merge(VenueRepository.layer, AdminRepository.layer)));
}
