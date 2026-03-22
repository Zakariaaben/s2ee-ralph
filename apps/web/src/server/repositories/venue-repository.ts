import { DB } from "@project/db";
import { company } from "@project/db/schema/company";
import { room } from "@project/db/schema/venue";
import { Room, VenueCompany, VenueRoom } from "@project/domain";
import { asc, eq, isNotNull } from "drizzle-orm";
import { Effect, Layer, ServiceMap } from "effect";

const makeRoomId = () => crypto.randomUUID();

const toRoom = (roomRow: typeof room.$inferSelect) =>
  new Room({
    id: roomRow.id as Room["id"],
    code: roomRow.code,
  });

export class VenueRepository extends ServiceMap.Service<
  VenueRepository,
  {
    readonly listRooms: () => Effect.Effect<ReadonlyArray<VenueRoom>>;
    readonly createRoom: (
      input: {
        readonly code: string;
      },
    ) => Effect.Effect<Room>;
    readonly updateRoom: (
      input: {
        readonly roomId: string;
        readonly code: string;
      },
    ) => Effect.Effect<Room | null>;
    readonly deleteRoom: (
      input: {
        readonly roomId: string;
      },
    ) => Effect.Effect<Room | null>;
    readonly assignCompanyPlacement: (
      input: {
        readonly companyId: string;
        readonly roomId: string;
        readonly standNumber: number;
      },
    ) => Effect.Effect<VenueCompany | null>;
    readonly clearCompanyPlacement: (
      input: {
        readonly companyId: string;
      },
    ) => Effect.Effect<boolean>;
    readonly markCompanyArrived: (
      input: {
        readonly companyId: string;
      },
    ) => Effect.Effect<VenueCompany | null>;
  }
>()("@project/web/VenueRepository") {
  static readonly layer = Layer.effect(
    VenueRepository,
    Effect.gen(function*() {
      const db = yield* DB;

      const listRoomRows = () =>
        Effect.promise(() =>
          db
            .select()
            .from(room)
            .orderBy(asc(room.code)),
        );

      const listPlacedCompanies = () =>
        Effect.promise(() =>
          db
            .select({
              companyId: company.id,
              companyName: company.name,
              roomId: company.roomId,
              standNumber: company.standNumber,
              arrivalStatus: company.arrivalStatus,
            })
            .from(company)
            .where(isNotNull(company.roomId))
            .orderBy(asc(company.roomId), asc(company.standNumber), asc(company.name)),
        );

      const loadPlacedCompanyById = (companyId: string) =>
        Effect.gen(function*() {
          const placedCompanies = yield* Effect.promise(() =>
            db
              .select({
                companyId: company.id,
                companyName: company.name,
                standNumber: company.standNumber,
                arrivalStatus: company.arrivalStatus,
              })
              .from(company)
              .where(eq(company.id, companyId))
              .limit(1),
          );

          const placedCompany = placedCompanies[0];

          if (!placedCompany || placedCompany.standNumber === null) {
            return null;
          }

          return new VenueCompany({
            companyId: placedCompany.companyId as VenueCompany["companyId"],
            companyName: placedCompany.companyName,
            standNumber: placedCompany.standNumber,
            arrivalStatus: placedCompany.arrivalStatus,
          });
        });

      return VenueRepository.of({
        listRooms: () =>
          Effect.gen(function*() {
            const roomRows = yield* listRoomRows();
            const placedCompanies = yield* listPlacedCompanies();
            const companiesByRoomId = new Map<string, Array<VenueCompany>>();

            for (const placedCompany of placedCompanies) {
              if (placedCompany.roomId === null || placedCompany.standNumber === null) {
                continue;
              }

              const roomCompanies = companiesByRoomId.get(placedCompany.roomId) ?? [];

              roomCompanies.push(
                new VenueCompany({
                  companyId: placedCompany.companyId as VenueCompany["companyId"],
                  companyName: placedCompany.companyName,
                  standNumber: placedCompany.standNumber,
                  arrivalStatus: placedCompany.arrivalStatus,
                }),
              );

              companiesByRoomId.set(placedCompany.roomId, roomCompanies);
            }

            return roomRows.map(
              (roomRow) =>
                new VenueRoom({
                  id: roomRow.id as VenueRoom["id"],
                  code: roomRow.code,
                  companies: companiesByRoomId.get(roomRow.id) ?? [],
                }),
            );
          }),
        createRoom: ({ code }) =>
          Effect.gen(function*() {
            const insertedRooms = yield* Effect.promise(() =>
              db
                .insert(room)
                .values({
                  id: makeRoomId(),
                  code,
                })
                .onConflictDoUpdate({
                  target: room.code,
                  set: {
                    updatedAt: new Date(),
                  },
                })
                .returning(),
            );

            const savedRoom = insertedRooms[0];

            if (!savedRoom) {
              return yield* Effect.die("Room upsert did not return a room");
            }

            return toRoom(savedRoom);
          }),
        updateRoom: ({ roomId, code }) =>
          Effect.gen(function*() {
            const updatedRooms = yield* Effect.promise(() =>
              db
                .update(room)
                .set({
                  code,
                  updatedAt: new Date(),
                })
                .where(eq(room.id, roomId))
                .returning(),
            );
            const savedRoom = updatedRooms[0];

            if (!savedRoom) {
              return null;
            }

            return toRoom(savedRoom);
          }),
        deleteRoom: ({ roomId }) =>
          Effect.gen(function*() {
            const deletedRoom = yield* Effect.promise(() =>
              db.transaction(async (tx) => {
                const roomRows = await tx
                  .select()
                  .from(room)
                  .where(eq(room.id, roomId))
                  .limit(1);
                const savedRoom = roomRows[0];

                if (!savedRoom) {
                  return null;
                }

                await tx
                  .update(company)
                  .set({
                    roomId: null,
                    standNumber: null,
                    arrivalStatus: "not-arrived",
                    updatedAt: new Date(),
                  })
                  .where(eq(company.roomId, roomId));

                await tx
                  .delete(room)
                  .where(eq(room.id, roomId));

                return savedRoom;
              }),
            );

            if (!deletedRoom) {
              return null;
            }

            return toRoom(deletedRoom);
          }),
        assignCompanyPlacement: ({ companyId, roomId, standNumber }) =>
          Effect.gen(function*() {
            const updatedCompanies = yield* Effect.promise(() =>
              db
                .update(company)
                .set({
                  roomId,
                  standNumber,
                  arrivalStatus: "not-arrived",
                  updatedAt: new Date(),
                })
                .where(eq(company.id, companyId))
                .returning({ id: company.id }),
            );

            if (updatedCompanies.length === 0) {
              return null;
            }

            return yield* loadPlacedCompanyById(companyId);
          }),
        clearCompanyPlacement: ({ companyId }) =>
          Effect.gen(function*() {
            const updatedCompanies = yield* Effect.promise(() =>
              db
                .update(company)
                .set({
                  roomId: null,
                  standNumber: null,
                  arrivalStatus: "not-arrived",
                  updatedAt: new Date(),
                })
                .where(eq(company.id, companyId))
                .returning({ id: company.id }),
            );

            return updatedCompanies.length > 0;
          }),
        markCompanyArrived: ({ companyId }) =>
          Effect.gen(function*() {
            const updatedCompanies = yield* Effect.promise(() =>
              db
                .update(company)
                .set({
                  arrivalStatus: "arrived",
                  updatedAt: new Date(),
                })
                .where(eq(company.id, companyId))
                .returning({ id: company.id }),
            );

            if (updatedCompanies.length === 0) {
              return null;
            }

            return yield* loadPlacedCompanyById(companyId);
          }),
      });
    }),
  );
}
