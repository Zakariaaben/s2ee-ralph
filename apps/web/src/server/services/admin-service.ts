import {
  type AdminAccessLedgerEntry,
  type AdminCompanyLedgerEntry,
  type AdminInterviewLedgerEntry,
  type AuthenticatedActor,
  type FeaturedCompany,
  type UserRoleValue,
} from "@project/domain";
import { Effect, Layer, ServiceMap } from "effect";
import * as HttpApiError from "effect/unstable/httpapi/HttpApiError";

import { AdminRepository } from "../repositories/admin-repository";

const requireAdminActor = (actor: AuthenticatedActor) =>
  Effect.gen(function* () {
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
    readonly listFeaturedCompanies: (
      actor: AuthenticatedActor,
    ) => Effect.Effect<ReadonlyArray<FeaturedCompany>, HttpApiError.Forbidden>;
    readonly listPublishedFeaturedCompanies: () => Effect.Effect<ReadonlyArray<FeaturedCompany>>;
    readonly upsertFeaturedCompany: (input: {
      readonly actor: AuthenticatedActor;
      readonly id: string | null;
      readonly name: string;
      readonly description: string;
      readonly logoLabel: string;
      readonly profiles: ReadonlyArray<string>;
      readonly employmentCount: number;
      readonly workerInternshipCount: number;
      readonly practicalInternshipCount: number;
      readonly pfeCount: number;
      readonly sortOrder: number;
      readonly isPublished: boolean;
    }) => Effect.Effect<FeaturedCompany, HttpApiError.Forbidden | HttpApiError.BadRequest>;
    readonly deleteFeaturedCompany: (input: {
      readonly actor: AuthenticatedActor;
      readonly id: string;
    }) => Effect.Effect<void, HttpApiError.Forbidden | HttpApiError.NotFound>;
    readonly changeAdminUserRole: (input: {
      readonly actor: AuthenticatedActor;
      readonly userId: string;
      readonly role: UserRoleValue;
    }) => Effect.Effect<AdminAccessLedgerEntry, HttpApiError.Forbidden | HttpApiError.NotFound>;
    readonly createAdminCompanyAccount: (input: {
      readonly actor: AuthenticatedActor;
      readonly companyName: string;
      readonly email: string;
      readonly password: string;
    }) => Effect.Effect<AdminAccessLedgerEntry, HttpApiError.Forbidden | HttpApiError.BadRequest>;
    readonly listAdminCompanyLedger: (
      actor: AuthenticatedActor,
    ) => Effect.Effect<ReadonlyArray<AdminCompanyLedgerEntry>, HttpApiError.Forbidden>;
    readonly listAdminInterviewLedger: (
      actor: AuthenticatedActor,
    ) => Effect.Effect<ReadonlyArray<AdminInterviewLedgerEntry>, HttpApiError.Forbidden>;
  }
>()("@project/web/AdminService") {
  static readonly layer = Layer.effect(
    AdminService,
    Effect.gen(function* () {
      const adminRepository = yield* AdminRepository;

      return AdminService.of({
        listFeaturedCompanies: (actor) =>
          Effect.gen(function* () {
            yield* requireAdminActor(actor);

            return yield* adminRepository.listFeaturedCompanies();
          }),
        listPublishedFeaturedCompanies: () =>
          Effect.gen(function* () {
            return yield* adminRepository.listFeaturedCompanies({ publishedOnly: true });
          }),
        upsertFeaturedCompany: (input) =>
          Effect.gen(function* () {
            yield* requireAdminActor(input.actor);

            return yield* adminRepository.upsertFeaturedCompany(input);
          }),
        deleteFeaturedCompany: ({ actor, id }) =>
          Effect.gen(function* () {
            yield* requireAdminActor(actor);

            const deleted = yield* adminRepository.deleteFeaturedCompany({ id });

            if (!deleted) {
              return yield* Effect.fail(new HttpApiError.NotFound({}));
            }
          }),
        listAdminAccessLedger: (actor) =>
          Effect.gen(function* () {
            yield* requireAdminActor(actor);

            return yield* adminRepository.listAccessLedger();
          }),
        changeAdminUserRole: ({ actor, userId, role }) =>
          Effect.gen(function* () {
            yield* requireAdminActor(actor);

            const updatedEntry = yield* adminRepository.changeUserRole({
              userId,
              role,
            });

            if (!updatedEntry) {
              return yield* Effect.fail(new HttpApiError.NotFound({}));
            }

            return updatedEntry;
          }),
        createAdminCompanyAccount: ({ actor, companyName, email, password }) =>
          Effect.gen(function* () {
            yield* requireAdminActor(actor);

            return yield* adminRepository
              .createCompanyAccount({
                companyName,
                email,
                password,
              })
              .pipe(Effect.mapError(() => new HttpApiError.BadRequest({})));
          }),
        listAdminCompanyLedger: (actor) =>
          Effect.gen(function* () {
            yield* requireAdminActor(actor);

            return yield* adminRepository.listCompanyLedger();
          }),
        listAdminInterviewLedger: (actor) =>
          Effect.gen(function* () {
            yield* requireAdminActor(actor);

            return yield* adminRepository.listInterviewLedger();
          }),
      });
    }),
  ).pipe(Layer.provide(AdminRepository.layer));
}
