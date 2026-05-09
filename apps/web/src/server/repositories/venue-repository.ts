import { DB } from "@project/db";
import { company } from "@project/db/schema/company";
import { room, zone } from "@project/db/schema/venue";
import { Room, VenueCompany, VenueRoom, Zone } from "@project/domain";
import { asc, eq, isNotNull } from "drizzle-orm";
import { Effect, Layer, ServiceMap } from "effect";

const makeRoomId = () => crypto.randomUUID();

const toZone = (zoneRow: typeof zone.$inferSelect | null) =>
  zoneRow == null
    ? null
    : new Zone({
        id: zoneRow.id as Zone["id"],
        code: zoneRow.code,
        label: zoneRow.label,
        latitude: zoneRow.latitude,
        longitude: zoneRow.longitude,
      });

const toRoom = (roomRow: typeof room.$inferSelect, zoneRow: typeof zone.$inferSelect | null) =>
  new Room({
    id: roomRow.id as Room["id"],
    code: roomRow.code,
    zone: toZone(zoneRow),
  });

export class VenueRepository extends ServiceMap.Service<
  VenueRepository,
  {
    readonly listRooms: () => Effect.Effect<ReadonlyArray<VenueRoom>>;
    readonly createRoom: (input: { readonly code: string; readonly zoneId?: string }) => Effect.Effect<Room>;
    readonly updateRoom: (input: {
      readonly roomId: string;
      readonly code: string;
      readonly zoneId?: string;
    }) => Effect.Effect<Room | null>;
    readonly deleteRoom: (input: { readonly roomId: string }) => Effect.Effect<Room | null>;
    readonly markCompanyArrived: (input: {
      readonly companyId: string;
    }) => Effect.Effect<VenueCompany | null>;
    readonly resetCompanyArrival: (input: {
      readonly companyId: string;
    }) => Effect.Effect<VenueCompany | null>;
  }
>()("@project/web/VenueRepository") {
  static readonly layer = Layer.effect(
    VenueRepository,
    Effect.gen(function*() {
      const db = yield* DB;

      const listRoomRows = () =>
        Effect.promise(() =>
          db
            .select({ roomRow: room, zoneRow: zone })
            .from(room)
            .leftJoin(zone, eq(room.zoneId, zone.id))
            .orderBy(asc(room.code)),
        );

      const listAssignedCompanies = () =>
        Effect.promise(() =>
          db
            .select({
              companyId: company.id,
              companyName: company.name,
              roomId: company.roomId,
              arrivalStatus: company.arrivalStatus,
            })
            .from(company)
            .where(isNotNull(company.roomId))
            .orderBy(asc(company.roomId), asc(company.name)),
        );

      const buildVenueRooms = Effect.gen(function*() {
        const roomRows = yield* listRoomRows();
        const assignedCompanies = yield* listAssignedCompanies();
        const companiesByRoomId = new Map<string, Array<VenueCompany>>();

        for (const assignedCompany of assignedCompanies) {
          if (assignedCompany.roomId == null) {
            continue;
          }

          const roomCompanies = companiesByRoomId.get(assignedCompany.roomId) ?? [];
          roomCompanies.push(
            new VenueCompany({
              companyId: assignedCompany.companyId as VenueCompany["companyId"],
              companyName: assignedCompany.companyName,
              arrivalStatus: assignedCompany.arrivalStatus,
            }),
          );
          companiesByRoomId.set(assignedCompany.roomId, roomCompanies);
        }

        return roomRows.map(
          ({ roomRow, zoneRow }) =>
            new VenueRoom({
              id: roomRow.id as VenueRoom["id"],
              code: roomRow.code,
              zone: toZone(zoneRow),
              companies: companiesByRoomId.get(roomRow.id) ?? [],
            }),
        );
      });

      const loadCompanyById = (companyId: string) =>
        Effect.gen(function*() {
          const rows = yield* Effect.promise(() =>
            db
              .select({
                companyId: company.id,
                companyName: company.name,
                arrivalStatus: company.arrivalStatus,
              })
              .from(company)
              .where(eq(company.id, companyId))
              .limit(1),
          );

          const row = rows[0];

          if (!row) {
            return null;
          }

          return new VenueCompany({
            companyId: row.companyId as VenueCompany["companyId"],
            companyName: row.companyName,
            arrivalStatus: row.arrivalStatus,
          });
        });

      return VenueRepository.of({
        listRooms: () => buildVenueRooms,
        createRoom: ({ code, zoneId }) =>
          Effect.gen(function*() {
            const insertedRooms = yield* Effect.promise(() =>
              db
                .insert(room)
                .values({
                  id: makeRoomId(),
                  code,
                  zoneId: zoneId ?? null,
                })
                .onConflictDoUpdate({
                  target: room.code,
                  set: { updatedAt: new Date() },
                })
                .returning(),
            );

            const savedRoom = insertedRooms[0];

            if (!savedRoom) {
              return yield* Effect.die("Room upsert did not return a room");
            }

            const zoneRow = zoneId
              ? (yield* Effect.promise(() =>
                  db.select().from(zone).where(eq(zone.id, zoneId)).limit(1),
                ))[0] ?? null
              : null;

            return toRoom(savedRoom, zoneRow);
          }),
        updateRoom: ({ roomId, code, zoneId }) =>
          Effect.gen(function*() {
            const updatedRooms = yield* Effect.promise(() =>
              db
                .update(room)
                .set({ code, zoneId: zoneId ?? null, updatedAt: new Date() })
                .where(eq(room.id, roomId))
                .returning(),
            );

            const savedRoom = updatedRooms[0];

            if (!savedRoom) {
              return null;
            }

            const zoneRow =
              savedRoom.zoneId != null
                ? (yield* Effect.promise(() =>
                    db.select().from(zone).where(eq(zone.id, savedRoom.zoneId!)).limit(1),
                  ))[0] ?? null
                : null;

            return toRoom(savedRoom, zoneRow);
          }),
        deleteRoom: ({ roomId }) =>
          Effect.gen(function*() {
            const deletedRooms = yield* Effect.promise(() =>
              db.delete(room).where(eq(room.id, roomId)).returning(),
            );

            const deletedRoom = deletedRooms[0];

            return deletedRoom ? toRoom(deletedRoom, null) : null;
          }),
        markCompanyArrived: ({ companyId }) =>
          Effect.gen(function*() {
            const updatedCompanies = yield* Effect.promise(() =>
              db
                .update(company)
                .set({ arrivalStatus: "arrived", updatedAt: new Date() })
                .where(eq(company.id, companyId))
                .returning({ id: company.id }),
            );

            if (updatedCompanies.length === 0) {
              return null;
            }

            return yield* loadCompanyById(companyId);
          }),
        resetCompanyArrival: ({ companyId }) =>
          Effect.gen(function*() {
            const updatedCompanies = yield* Effect.promise(() =>
              db
                .update(company)
                .set({ arrivalStatus: "not-arrived", updatedAt: new Date() })
                .where(eq(company.id, companyId))
                .returning({ id: company.id }),
            );

            if (updatedCompanies.length === 0) {
              return null;
            }

            return yield* loadCompanyById(companyId);
          }),
      });
    }),
  );
}
