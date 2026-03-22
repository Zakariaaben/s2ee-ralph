import {
  type AuthenticatedActor,
  ControlledVocabularies,
  type CvProfileType,
  type GlobalInterviewTag,
} from "@project/domain";
import { Effect, Layer, ServiceMap } from "effect";
import * as HttpApiError from "effect/unstable/httpapi/HttpApiError";

import { VocabularyRepository } from "../repositories/vocabulary-repository";

type SeedVocabularyEntry = {
  readonly id: string;
  readonly label: string;
};

type VocabularyEntryWithId = {
  readonly id: string;
};

const requireAuthenticatedActor = (actor: AuthenticatedActor) => Effect.succeed(actor);

const requireAdminActor = (actor: AuthenticatedActor) =>
  Effect.gen(function*() {
    if (actor.role !== "admin") {
      yield* new HttpApiError.Forbidden({});
    }

    return actor;
  });

const ensureEntryAbsent = (
  id: string,
  entries: ReadonlyArray<VocabularyEntryWithId>,
) =>
  Effect.gen(function*() {
    if (entries.some((entry) => entry.id === id)) {
      yield* new HttpApiError.BadRequest({});
    }
  });

const ensureEntryPresent = (
  id: string,
  entries: ReadonlyArray<VocabularyEntryWithId>,
) =>
  Effect.gen(function*() {
    if (!entries.some((entry) => entry.id === id)) {
      yield* new HttpApiError.BadRequest({});
    }
  });

export class VocabularyService extends ServiceMap.Service<
  VocabularyService,
  {
    readonly listCvProfileTypes: (
      actor: AuthenticatedActor,
    ) => Effect.Effect<ReadonlyArray<CvProfileType>, HttpApiError.Unauthorized>;
    readonly listGlobalInterviewTags: (
      actor: AuthenticatedActor,
    ) => Effect.Effect<
      ReadonlyArray<GlobalInterviewTag>,
      HttpApiError.Unauthorized
    >;
    readonly seedControlledVocabularies: (
      input: {
        readonly actor: AuthenticatedActor;
        readonly cvProfileTypes: ReadonlyArray<SeedVocabularyEntry>;
        readonly globalInterviewTags: ReadonlyArray<SeedVocabularyEntry>;
      },
    ) => Effect.Effect<
      ControlledVocabularies,
      HttpApiError.Forbidden | HttpApiError.BadRequest
    >;
    readonly addCvProfileType: (
      input: {
        readonly actor: AuthenticatedActor;
        readonly entry: SeedVocabularyEntry;
      },
    ) => Effect.Effect<
      ReadonlyArray<CvProfileType>,
      HttpApiError.Forbidden | HttpApiError.BadRequest
    >;
    readonly deleteCvProfileType: (
      input: {
        readonly actor: AuthenticatedActor;
        readonly id: string;
      },
    ) => Effect.Effect<
      ReadonlyArray<CvProfileType>,
      HttpApiError.Forbidden | HttpApiError.BadRequest
    >;
    readonly replaceCvProfileTypes: (
      input: {
        readonly actor: AuthenticatedActor;
        readonly entries: ReadonlyArray<SeedVocabularyEntry>;
      },
    ) => Effect.Effect<
      ReadonlyArray<CvProfileType>,
      HttpApiError.Forbidden | HttpApiError.BadRequest
    >;
    readonly addGlobalInterviewTag: (
      input: {
        readonly actor: AuthenticatedActor;
        readonly entry: SeedVocabularyEntry;
      },
    ) => Effect.Effect<
      ReadonlyArray<GlobalInterviewTag>,
      HttpApiError.Forbidden | HttpApiError.BadRequest
    >;
    readonly deleteGlobalInterviewTag: (
      input: {
        readonly actor: AuthenticatedActor;
        readonly id: string;
      },
    ) => Effect.Effect<
      ReadonlyArray<GlobalInterviewTag>,
      HttpApiError.Forbidden | HttpApiError.BadRequest
    >;
    readonly replaceGlobalInterviewTags: (
      input: {
        readonly actor: AuthenticatedActor;
        readonly entries: ReadonlyArray<SeedVocabularyEntry>;
      },
    ) => Effect.Effect<
      ReadonlyArray<GlobalInterviewTag>,
      HttpApiError.Forbidden | HttpApiError.BadRequest
    >;
  }
>()("@project/web/VocabularyService") {
  static readonly layer = Layer.effect(
    VocabularyService,
    Effect.gen(function*() {
      const vocabularyRepository = yield* VocabularyRepository;

      return VocabularyService.of({
        listCvProfileTypes: (actor) =>
          Effect.gen(function*() {
            yield* requireAuthenticatedActor(actor);

            return yield* vocabularyRepository.listCvProfileTypes();
          }),
        listGlobalInterviewTags: (actor) =>
          Effect.gen(function*() {
            yield* requireAuthenticatedActor(actor);

            return yield* vocabularyRepository.listGlobalInterviewTags();
          }),
        addCvProfileType: ({ actor, entry }) =>
          Effect.gen(function*() {
            yield* requireAdminActor(actor);

            const existing = yield* vocabularyRepository.listCvProfileTypes();

            yield* ensureEntryAbsent(entry.id, existing);

            return yield* vocabularyRepository.addCvProfileType(entry);
          }),
        deleteCvProfileType: ({ actor, id }) =>
          Effect.gen(function*() {
            yield* requireAdminActor(actor);

            const existing = yield* vocabularyRepository.listCvProfileTypes();

            yield* ensureEntryPresent(id, existing);

            return yield* vocabularyRepository.deleteCvProfileType(id);
          }),
        replaceCvProfileTypes: ({ actor, entries }) =>
          Effect.gen(function*() {
            yield* requireAdminActor(actor);

            return yield* vocabularyRepository.replaceCvProfileTypes(entries);
          }),
        addGlobalInterviewTag: ({ actor, entry }) =>
          Effect.gen(function*() {
            yield* requireAdminActor(actor);

            const existing = yield* vocabularyRepository.listGlobalInterviewTags();

            yield* ensureEntryAbsent(entry.id, existing);

            return yield* vocabularyRepository.addGlobalInterviewTag(entry);
          }),
        deleteGlobalInterviewTag: ({ actor, id }) =>
          Effect.gen(function*() {
            yield* requireAdminActor(actor);

            const existing = yield* vocabularyRepository.listGlobalInterviewTags();

            yield* ensureEntryPresent(id, existing);

            return yield* vocabularyRepository.deleteGlobalInterviewTag(id);
          }),
        replaceGlobalInterviewTags: ({ actor, entries }) =>
          Effect.gen(function*() {
            yield* requireAdminActor(actor);

            return yield* vocabularyRepository.replaceGlobalInterviewTags(entries);
          }),
        seedControlledVocabularies: ({
          actor,
          cvProfileTypes,
          globalInterviewTags,
        }) =>
          Effect.gen(function*() {
            yield* requireAdminActor(actor);

            return yield* vocabularyRepository.seedControlledVocabularies({
              cvProfileTypes,
              globalInterviewTags,
            });
          }),
      });
    }),
  ).pipe(Layer.provide(VocabularyRepository.layer));
}
