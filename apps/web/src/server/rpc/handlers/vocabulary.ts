import { CurrentActor, VocabularyRpcGroup } from "@project/rpc";
import { Effect } from "effect";

import { VocabularyService } from "../../services/vocabulary-service";

export const makeVocabularyRpcHandlers = Effect.gen(function*() {
  const vocabularyService = yield* VocabularyService;

  return VocabularyRpcGroup.of({
    listCvProfileTypes: () =>
      Effect.gen(function*() {
        const actor = yield* CurrentActor;

        return yield* vocabularyService.listCvProfileTypes(actor);
      }),
    listGlobalInterviewTags: () =>
      Effect.gen(function*() {
        const actor = yield* CurrentActor;

        return yield* vocabularyService.listGlobalInterviewTags(actor);
      }),
    addCvProfileType: (input) =>
      Effect.gen(function*() {
        const actor = yield* CurrentActor;

        return yield* vocabularyService.addCvProfileType({
          actor,
          entry: input,
        });
      }),
    deleteCvProfileType: (input) =>
      Effect.gen(function*() {
        const actor = yield* CurrentActor;

        return yield* vocabularyService.deleteCvProfileType({
          actor,
          id: input.id,
        });
      }),
    replaceCvProfileTypes: (input) =>
      Effect.gen(function*() {
        const actor = yield* CurrentActor;

        return yield* vocabularyService.replaceCvProfileTypes({
          actor,
          entries: input.entries,
        });
      }),
    addGlobalInterviewTag: (input) =>
      Effect.gen(function*() {
        const actor = yield* CurrentActor;

        return yield* vocabularyService.addGlobalInterviewTag({
          actor,
          entry: input,
        });
      }),
    deleteGlobalInterviewTag: (input) =>
      Effect.gen(function*() {
        const actor = yield* CurrentActor;

        return yield* vocabularyService.deleteGlobalInterviewTag({
          actor,
          id: input.id,
        });
      }),
    replaceGlobalInterviewTags: (input) =>
      Effect.gen(function*() {
        const actor = yield* CurrentActor;

        return yield* vocabularyService.replaceGlobalInterviewTags({
          actor,
          entries: input.entries,
        });
      }),
    seedControlledVocabularies: (input) =>
      Effect.gen(function*() {
        const actor = yield* CurrentActor;

        return yield* vocabularyService.seedControlledVocabularies({
          actor,
          cvProfileTypes: input.cvProfileTypes,
          globalInterviewTags: input.globalInterviewTags,
        });
      }),
  });
});
