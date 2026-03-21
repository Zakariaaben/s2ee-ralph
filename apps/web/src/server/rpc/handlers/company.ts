import { CompanyRpcGroup, CurrentActor } from "@project/rpc";
import { Effect } from "effect";

import { CompanyService } from "../../services/company-service";

export const makeCompanyRpcHandlers = Effect.gen(function*() {
  const companyService = yield* CompanyService;

  return CompanyRpcGroup.of({
    currentCompany: () =>
      Effect.gen(function*() {
        const actor = yield* CurrentActor;

        return yield* companyService.getCurrentCompany(actor);
      }),
    upsertCompanyProfile: (input) =>
      Effect.gen(function*() {
        const actor = yield* CurrentActor;

        return yield* companyService.upsertCompanyProfile({
          actor,
          name: input.name,
        });
      }),
    addRecruiter: (input) =>
      Effect.gen(function*() {
        const actor = yield* CurrentActor;

        return yield* companyService.addRecruiter({
          actor,
          name: input.name,
        });
      }),
    renameRecruiter: (input) =>
      Effect.gen(function*() {
        const actor = yield* CurrentActor;

        return yield* companyService.renameRecruiter({
          actor,
          recruiterId: input.recruiterId,
          name: input.name,
        });
      }),
  });
});
