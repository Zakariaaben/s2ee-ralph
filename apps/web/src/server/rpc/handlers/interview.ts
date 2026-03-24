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
    getCurrentCompanyInterviewDetail: (input) =>
      Effect.gen(function*() {
        const actor = yield* CurrentActor;

        return yield* interviewService.getCurrentCompanyInterviewDetail({
          actor,
          interviewId: input.interviewId,
        });
      }),
    getCurrentCompanyInterviewCvDownloadUrl: (input) =>
      Effect.gen(function*() {
        const actor = yield* CurrentActor;

        return yield* interviewService.getCurrentCompanyInterviewCvDownloadUrl({
          actor,
          interviewId: input.interviewId,
        });
      }),
    exportCurrentCompanyCompletedInterviews: (input) =>
      Effect.gen(function*() {
        const actor = yield* CurrentActor;

        return yield* interviewService.exportCurrentCompanyCompletedInterviews({
          actor,
          includeCvFiles: input.includeCvFiles,
        });
      }),
    startInterview: (input) =>
      Effect.gen(function*() {
        const actor = yield* CurrentActor;

        return yield* interviewService.startInterview({
          actor,
          recruiterId: input.recruiterId,
          presentationCode: input.presentationIdentity,
        });
      }),
    completeInterview: (input) =>
      Effect.gen(function*() {
        const actor = yield* CurrentActor;

        return yield* interviewService.completeInterview({
          actor,
          interviewId: input.interviewId,
          score: input.score,
          globalTagIds: input.globalTagIds,
          companyTagLabels: input.companyTagLabels,
          notes: input.notes,
        });
      }),
    cancelInterview: (input) =>
      Effect.gen(function*() {
        const actor = yield* CurrentActor;

        return yield* interviewService.cancelInterview({
          actor,
          interviewId: input.interviewId,
          notes: input.notes,
        });
      }),
  });
});
