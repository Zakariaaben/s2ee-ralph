import {
  type AdminCompanyLedgerEntry,
  type AdminInterviewLedgerEntry,
  type AuthenticatedActor,
} from "@project/domain";
import { Effect, Layer, ServiceMap } from "effect";
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
    Effect.gen(function*() {
      const adminRepository = yield* AdminRepository;

      return AdminService.of({
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
      });
    }),
  ).pipe(Layer.provide(AdminRepository.layer));
}
