import { AdminRpcGroup, CurrentActor, PublicFeaturedCompanyRpcGroup } from "@project/rpc";
import { Effect } from "effect";

import { AdminService } from "../../services/admin-service";

export const makeAdminRpcHandlers = Effect.gen(function* () {
  const adminService = yield* AdminService;

  return AdminRpcGroup.of({
    listAdminCompanyLedger: () =>
      Effect.gen(function* () {
        const actor = yield* CurrentActor;

        return yield* adminService.listAdminCompanyLedger(actor);
      }),
    listAdminInterviewLedger: () =>
      Effect.gen(function* () {
        const actor = yield* CurrentActor;

        return yield* adminService.listAdminInterviewLedger(actor);
      }),
    listAdminAccessLedger: () =>
      Effect.gen(function* () {
        const actor = yield* CurrentActor;

        return yield* adminService.listAdminAccessLedger(actor);
      }),
    listAdminFeaturedCompanies: () =>
      Effect.gen(function* () {
        const actor = yield* CurrentActor;

        return yield* adminService.listFeaturedCompanies(actor);
      }),
    upsertFeaturedCompany: (input) =>
      Effect.gen(function* () {
        const actor = yield* CurrentActor;

        return yield* adminService.upsertFeaturedCompany({
          actor,
          ...input,
        });
      }),
    deleteFeaturedCompany: ({ id }) =>
      Effect.gen(function* () {
        const actor = yield* CurrentActor;

        return yield* adminService.deleteFeaturedCompany({ actor, id });
      }),
    changeAdminUserRole: ({ userId, role }) =>
      Effect.gen(function* () {
        const actor = yield* CurrentActor;

        return yield* adminService.changeAdminUserRole({
          actor,
          userId,
          role,
        });
      }),
    createAdminCompanyAccount: ({ companyName, email, password }) =>
      Effect.gen(function* () {
        const actor = yield* CurrentActor;

        return yield* adminService.createAdminCompanyAccount({
          actor,
          companyName,
          email,
          password,
        });
      }),
  });
});

export const makePublicFeaturedCompanyRpcHandlers = Effect.gen(function* () {
  const adminService = yield* AdminService;

  return PublicFeaturedCompanyRpcGroup.of({
    listFeaturedCompanies: () =>
      Effect.gen(function* () {
        return yield* adminService.listPublishedFeaturedCompanies();
      }),
  });
});
