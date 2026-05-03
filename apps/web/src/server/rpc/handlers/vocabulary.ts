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
    listStudentMajors: () =>
      Effect.gen(function*() {
        const actor = yield* CurrentActor;

        return yield* vocabularyService.listStudentMajors(actor);
      }),
    listStudentInstitutions: () =>
      Effect.gen(function*() {
        const actor = yield* CurrentActor;

        return yield* vocabularyService.listStudentInstitutions(actor);
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
    addStudentMajor: (input) =>
      Effect.gen(function*() {
        const actor = yield* CurrentActor;

        return yield* vocabularyService.addStudentMajor({
          actor,
          entry: input,
        });
      }),
    deleteStudentMajor: (input) =>
      Effect.gen(function*() {
        const actor = yield* CurrentActor;

        return yield* vocabularyService.deleteStudentMajor({
          actor,
          id: input.id,
        });
      }),
    replaceStudentMajors: (input) =>
      Effect.gen(function*() {
        const actor = yield* CurrentActor;

        return yield* vocabularyService.replaceStudentMajors({
          actor,
          entries: input.entries,
        });
      }),
    addStudentInstitution: (input) =>
      Effect.gen(function*() {
        const actor = yield* CurrentActor;

        return yield* vocabularyService.addStudentInstitution({
          actor,
          entry: input,
        });
      }),
    deleteStudentInstitution: (input) =>
      Effect.gen(function*() {
        const actor = yield* CurrentActor;

        return yield* vocabularyService.deleteStudentInstitution({
          actor,
          id: input.id,
        });
      }),
    replaceStudentInstitutions: (input) =>
      Effect.gen(function*() {
        const actor = yield* CurrentActor;

        return yield* vocabularyService.replaceStudentInstitutions({
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
          studentInstitutions: input.studentInstitutions,
          studentMajors: input.studentMajors,
        });
      }),
  });
});
