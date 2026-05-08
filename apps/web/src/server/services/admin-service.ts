import {
  type AdminAccessLedgerEntry,
  type AdminCompanyLedgerEntry,
  type AdminInterviewLedgerEntry,
  type AuthenticatedActor,
  type UserRoleValue,
  type Zone,
} from "@project/domain";
import { Effect, Layer, Option, ServiceMap } from "effect";
import * as HttpApiError from "effect/unstable/httpapi/HttpApiError";

import { AdminRepository } from "../repositories/admin-repository";

const requireAdminActor = (actor: AuthenticatedActor) =>
  Effect.gen(function*() {
    if (actor.role !== "admin") {
      yield* new HttpApiError.Forbidden({});
    }

    return actor;
  });

export class AdminService extends ServiceMap.Service<
  AdminService,
  {
    readonly listAdminAccessLedger: (
      actor: AuthenticatedActor,
    ) => Effect.Effect<ReadonlyArray<AdminAccessLedgerEntry>, HttpApiError.Forbidden>;
    readonly changeAdminUserRole: (input: {
      readonly actor: AuthenticatedActor;
      readonly userId: string;
      readonly role: UserRoleValue;
    }) => Effect.Effect<
      AdminAccessLedgerEntry,
      HttpApiError.Forbidden | HttpApiError.NotFound | HttpApiError.BadRequest
    >;
    readonly createAdminCompanyAccount: (input: {
      readonly actor: AuthenticatedActor;
      readonly companyName: string;
      readonly email: string;
      readonly password: string;
      readonly logoUrl: string | undefined;
      readonly zoneCode: string | undefined;
      readonly roomCode: string | undefined;
    }) => Effect.Effect<AdminAccessLedgerEntry, HttpApiError.Forbidden | HttpApiError.BadRequest>;
    readonly listAdminCompanyLedger: (
      actor: AuthenticatedActor,
    ) => Effect.Effect<ReadonlyArray<AdminCompanyLedgerEntry>, HttpApiError.Forbidden>;
    readonly listAdminInterviewLedger: (
      actor: AuthenticatedActor,
    ) => Effect.Effect<ReadonlyArray<AdminInterviewLedgerEntry>, HttpApiError.Forbidden>;
    readonly updateAdminCompany: (input: {
      readonly actor: AuthenticatedActor;
      readonly companyId: string;
      readonly name: Option.Option<string>;
      readonly email: Option.Option<string>;
      readonly password: Option.Option<string>;
      readonly logoUrl: Option.Option<string>;
      readonly zoneCode: Option.Option<string>;
      readonly roomCode: Option.Option<string>;
    }) => Effect.Effect<AdminCompanyLedgerEntry, HttpApiError.Forbidden | HttpApiError.NotFound | HttpApiError.BadRequest>;
    readonly deleteAdminCompany: (input: {
      readonly actor: AuthenticatedActor;
      readonly companyId: string;
    }) => Effect.Effect<boolean, HttpApiError.Forbidden | HttpApiError.NotFound>;
    readonly listAdminZones: (
      actor: AuthenticatedActor,
    ) => Effect.Effect<ReadonlyArray<Zone>, HttpApiError.Forbidden>;
    readonly createAdminZone: (input: {
      readonly actor: AuthenticatedActor;
      readonly code: string;
      readonly label: string;
      readonly latitude: number | undefined;
      readonly longitude: number | undefined;
    }) => Effect.Effect<Zone, HttpApiError.Forbidden | HttpApiError.BadRequest>;
    readonly updateAdminZone: (input: {
      readonly actor: AuthenticatedActor;
      readonly zoneId: string;
      readonly code: string;
      readonly label: string;
      readonly latitude: number | undefined;
      readonly longitude: number | undefined;
    }) => Effect.Effect<Zone, HttpApiError.Forbidden | HttpApiError.NotFound | HttpApiError.BadRequest>;
    readonly deleteAdminZone: (input: {
      readonly actor: AuthenticatedActor;
      readonly zoneId: string;
    }) => Effect.Effect<boolean, HttpApiError.Forbidden | HttpApiError.NotFound>;
    readonly importAdminCompaniesCsv: (input: {
      readonly actor: AuthenticatedActor;
      readonly csvContents: string;
    }) => Effect.Effect<number, HttpApiError.Forbidden | HttpApiError.BadRequest>;
  }
>()("@project/web/AdminService") {
  static readonly layer = Layer.effect(
    AdminService,
    Effect.gen(function*() {
      const adminRepository = yield* AdminRepository;

      return AdminService.of({
        listAdminAccessLedger: (actor) =>
          Effect.gen(function*() {
            yield* requireAdminActor(actor);

            return yield* adminRepository.listAccessLedger();
          }),
        changeAdminUserRole: ({ actor, userId, role }) =>
          Effect.gen(function*() {
            yield* requireAdminActor(actor);

            const result = yield* adminRepository.changeUserRole({
              userId,
              role,
            });

            if (result._tag === "not-found") {
              return yield* Effect.fail(new HttpApiError.NotFound({}));
            }

            if (result._tag === "incompatible-profile") {
              return yield* Effect.fail(new HttpApiError.BadRequest({}));
            }

            return result.entry;
          }),
        createAdminCompanyAccount: ({ actor, companyName, email, password, logoUrl, zoneCode, roomCode }) =>
          Effect.gen(function*() {
            yield* requireAdminActor(actor);

            return yield* adminRepository.createCompanyAccount({
              companyName,
              email,
              password,
              logoUrl,
              zoneCode,
              roomCode,
            }).pipe(
              Effect.mapError(() => new HttpApiError.BadRequest({})),
            );
          }),
        listAdminZones: (actor) =>
          Effect.gen(function*() {
            yield* requireAdminActor(actor);

            return yield* adminRepository.listZones();
          }),
        listAdminCompanyLedger: (actor) =>
          Effect.gen(function*() {
            yield* requireAdminActor(actor);

            return yield* adminRepository.listCompanyLedger();
          }),
        listAdminInterviewLedger: (actor) =>
          Effect.gen(function*() {
            yield* requireAdminActor(actor);

            return yield* adminRepository.listInterviewLedger();
          }),
        updateAdminCompany: ({ actor, companyId, name, email, password, logoUrl, zoneCode, roomCode }) =>
          Effect.gen(function*() {
            yield* requireAdminActor(actor);

            const updatedEntry = yield* adminRepository.updateCompany({
              companyId,
              name,
              email,
              password,
              logoUrl,
              zoneCode,
              roomCode,
            }).pipe(
              Effect.mapError((error) => {
                if (error.message === "Company not found") {
                  return new HttpApiError.NotFound({});
                }
                return new HttpApiError.BadRequest({});
              }),
            );

            return updatedEntry;
          }),
        deleteAdminCompany: ({ actor, companyId }) =>
          Effect.gen(function*() {
            yield* requireAdminActor(actor);

            const result = yield* adminRepository.deleteCompany({ companyId }).pipe(
              Effect.mapError(() => new HttpApiError.NotFound({})),
            );

            return result;
          }),
        createAdminZone: ({ actor, code, label, latitude, longitude }) =>
          Effect.gen(function*() {
            yield* requireAdminActor(actor);

            return yield* adminRepository.createZone({
              code,
              label,
              latitude,
              longitude,
            }).pipe(Effect.mapError(() => new HttpApiError.BadRequest({})));
          }),
        updateAdminZone: ({ actor, zoneId, code, label, latitude, longitude }) =>
          Effect.gen(function*() {
            yield* requireAdminActor(actor);

            const zone = yield* adminRepository.updateZone({
              zoneId,
              code,
              label,
              latitude,
              longitude,
            }).pipe(Effect.mapError(() => new HttpApiError.BadRequest({})));

            if (!zone) {
              return yield* Effect.fail(new HttpApiError.NotFound({}));
            }

            return zone;
          }),
        deleteAdminZone: ({ actor, zoneId }) =>
          Effect.gen(function*() {
            yield* requireAdminActor(actor);

            const deleted = yield* adminRepository.deleteZone({ zoneId });

            if (!deleted) {
              return yield* Effect.fail(new HttpApiError.NotFound({}));
            }

            return deleted;
          }),
        importAdminCompaniesCsv: ({ actor, csvContents }) =>
          Effect.gen(function*() {
            yield* requireAdminActor(actor);

            return yield* adminRepository.importCompaniesCsv({
              csvContents,
            }).pipe(Effect.mapError(() => new HttpApiError.BadRequest({})));
          }),
      });
    }),
  ).pipe(Layer.provide(AdminRepository.layer));
}
