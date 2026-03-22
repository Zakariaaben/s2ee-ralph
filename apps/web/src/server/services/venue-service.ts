import {
  type AuthenticatedActor,
  type PublishedVenueMap,
  type Room,
  type VenueCompany,
  type VenueRoom,
} from "@project/domain";
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
    readonly getPublishedVenueMap: () => Effect.Effect<PublishedVenueMap | null>;
    readonly publishVenueMap: (
      input: {
        readonly actor: AuthenticatedActor;
        readonly fileName: string;
        readonly contentType: string;
        readonly contentsBase64: string;
      },
    ) => Effect.Effect<PublishedVenueMap, HttpApiError.Forbidden>;
    readonly clearPublishedVenueMap: (
      actor: AuthenticatedActor,
    ) => Effect.Effect<void, HttpApiError.Forbidden>;
    readonly upsertVenueMapRoomPin: (
      input: {
        readonly actor: AuthenticatedActor;
        readonly roomId: string;
        readonly xPercent: number;
        readonly yPercent: number;
      },
    ) => Effect.Effect<
      PublishedVenueMap,
      HttpApiError.Forbidden | HttpApiError.BadRequest | HttpApiError.NotFound
    >;
    readonly deleteVenueMapRoomPin: (
      input: {
        readonly actor: AuthenticatedActor;
        readonly roomId: string;
      },
    ) => Effect.Effect<void, HttpApiError.Forbidden | HttpApiError.NotFound>;
    readonly createRoom: (
      input: {
        readonly actor: AuthenticatedActor;
        readonly code: string;
      },
    ) => Effect.Effect<Room, HttpApiError.Forbidden>;
    readonly updateRoom: (
      input: {
        readonly actor: AuthenticatedActor;
        readonly roomId: string;
        readonly code: string;
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
    readonly clearCompanyPlacement: (
      input: {
        readonly actor: AuthenticatedActor;
        readonly companyId: string;
      },
    ) => Effect.Effect<void, HttpApiError.Forbidden | HttpApiError.NotFound>;
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
        getPublishedVenueMap: () =>
          Effect.gen(function*() {
            return yield* venueRepository.getPublishedVenueMap();
          }),
        publishVenueMap: ({ actor, fileName, contentType, contentsBase64 }) =>
          Effect.gen(function*() {
            yield* requireAdminActor(actor);

            return yield* venueRepository.publishVenueMap({
              fileName,
              contentType,
              contentsBase64,
            });
          }),
        clearPublishedVenueMap: (actor) =>
          Effect.gen(function*() {
            yield* requireAdminActor(actor);

            yield* venueRepository.clearPublishedVenueMap();
          }),
        upsertVenueMapRoomPin: ({ actor, roomId, xPercent, yPercent }) =>
          Effect.gen(function*() {
            yield* requireAdminActor(actor);

            const existingMap = yield* venueRepository.getPublishedVenueMap();

            if (!existingMap) {
              return yield* Effect.fail(new HttpApiError.BadRequest({}));
            }

            const publishedMap = yield* venueRepository.upsertVenueMapRoomPin({
              roomId,
              xPercent,
              yPercent,
            });

            if (!publishedMap) {
              return yield* Effect.fail(new HttpApiError.NotFound({}));
            }

            return publishedMap;
          }),
        deleteVenueMapRoomPin: ({ actor, roomId }) =>
          Effect.gen(function*() {
            yield* requireAdminActor(actor);

            const deleted = yield* venueRepository.deleteVenueMapRoomPin({
              roomId,
            });

            if (!deleted) {
              return yield* Effect.fail(new HttpApiError.NotFound({}));
            }
          }),
        createRoom: ({ actor, code }) =>
          Effect.gen(function*() {
            yield* requireAdminActor(actor);

            return yield* venueRepository.createRoom({
              code,
            });
          }),
        updateRoom: ({ actor, roomId, code }) =>
          Effect.gen(function*() {
            yield* requireAdminActor(actor);

            const updatedRoom = yield* venueRepository.updateRoom({
              roomId,
              code,
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
        clearCompanyPlacement: ({ actor, companyId }) =>
          Effect.gen(function*() {
            yield* requireAdminActor(actor);

            const cleared = yield* venueRepository.clearCompanyPlacement({
              companyId,
            });

            if (!cleared) {
              return yield* Effect.fail(new HttpApiError.NotFound({}));
            }
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
