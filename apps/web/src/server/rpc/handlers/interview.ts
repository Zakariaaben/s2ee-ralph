import { CurrentActor, InterviewRpcGroup } from "@project/rpc";
import { Effect } from "effect";

import { InterviewService } from "../../services/interview-service";

export const makeInterviewRpcHandlers = Effect.gen(function*() {
  const interviewService = yield* InterviewService;

  return InterviewRpcGroup.of({
    listCurrentCompanyInterviews: () =>
      Effect.gen(function*() {
        const actor = yield* CurrentActor;

        return yield* interviewService.listCurrentCompanyInterviews(actor);
      }),
    listCurrentCompanyCompletedInterviews: () =>
      Effect.gen(function*() {
        const actor = yield* CurrentActor;

        return yield* interviewService.listCurrentCompanyCompletedInterviews(actor);
      }),
    exportCurrentCompanyCompletedInterviews: (input) =>
      Effect.gen(function*() {
        const actor = yield* CurrentActor;

        return yield* interviewService.exportCurrentCompanyCompletedInterviews({
          actor,
          includeCvFiles: input.includeCvFiles,
        });
      }),
    completeInterview: (input) =>
      Effect.gen(function*() {
        const actor = yield* CurrentActor;

        return yield* interviewService.completeInterview({
          actor,
          recruiterId: input.recruiterId,
          qrIdentity: input.qrIdentity,
          cvProfileId: input.cvProfileId,
          score: input.score,
          globalTagIds: input.globalTagIds,
          companyTagLabels: input.companyTagLabels,
        });
      }),
    cancelInterview: (input) =>
      Effect.gen(function*() {
        const actor = yield* CurrentActor;

        return yield* interviewService.cancelInterview({
          actor,
          recruiterId: input.recruiterId,
          qrIdentity: input.qrIdentity,
          cvProfileId: input.cvProfileId,
        });
      }),
  });
});
