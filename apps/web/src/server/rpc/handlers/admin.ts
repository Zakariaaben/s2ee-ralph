import { AdminRpcGroup, CurrentActor } from "@project/rpc";
import { Effect } from "effect";

import { AdminService } from "../../services/admin-service";

export const makeAdminRpcHandlers = Effect.gen(function*() {
  const adminService = yield* AdminService;

  return AdminRpcGroup.of({
    listAdminCompanyLedger: () =>
      Effect.gen(function*() {
        const actor = yield* CurrentActor;

        return yield* adminService.listAdminCompanyLedger(actor);
      }),
    listAdminInterviewLedger: () =>
      Effect.gen(function*() {
        const actor = yield* CurrentActor;

        return yield* adminService.listAdminInterviewLedger(actor);
      }),
    listAdminAccessLedger: () =>
      Effect.gen(function*() {
        const actor = yield* CurrentActor;

        return yield* adminService.listAdminAccessLedger(actor);
      }),
    changeAdminUserRole: ({ userId, role }) =>
      Effect.gen(function*() {
        const actor = yield* CurrentActor;

        return yield* adminService.changeAdminUserRole({
          actor,
          userId,
          role,
        });
      }),
    createAdminCompanyAccount: ({ companyName, email, password }) =>
      Effect.gen(function*() {
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
