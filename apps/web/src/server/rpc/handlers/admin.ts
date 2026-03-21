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
  });
});
