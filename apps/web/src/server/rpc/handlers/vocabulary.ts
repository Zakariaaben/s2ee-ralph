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
