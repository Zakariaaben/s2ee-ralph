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

const requireAuthenticatedActor = (actor: AuthenticatedActor) => Effect.succeed(actor);

const requireAdminActor = (actor: AuthenticatedActor) =>
  Effect.gen(function*() {
    if (actor.role !== "admin") {
      yield* new HttpApiError.Forbidden({});
    }

    return actor;
  });

const normalizeValue = (value: string) =>
  Effect.gen(function*() {
    const normalized = value.trim();

    if (normalized.length === 0) {
      yield* new HttpApiError.BadRequest({});
    }

    return normalized;
  });

const normalizeSeedEntries = (entries: ReadonlyArray<SeedVocabularyEntry>) =>
  Effect.gen(function*() {
    const seenIds = new Set<string>();
    const normalizedEntries: Array<SeedVocabularyEntry> = [];

    for (const entry of entries) {
      const id = yield* normalizeValue(entry.id);
      const label = yield* normalizeValue(entry.label);

      if (seenIds.has(id)) {
        yield* new HttpApiError.BadRequest({});
      }

      seenIds.add(id);
      normalizedEntries.push({ id, label });
    }

    return normalizedEntries;
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
        seedControlledVocabularies: ({
          actor,
          cvProfileTypes,
          globalInterviewTags,
        }) =>
          Effect.gen(function*() {
            yield* requireAdminActor(actor);

            return yield* vocabularyRepository.seedControlledVocabularies({
              cvProfileTypes: yield* normalizeSeedEntries(cvProfileTypes),
              globalInterviewTags: yield* normalizeSeedEntries(globalInterviewTags),
            });
          }),
      });
    }),
  ).pipe(Layer.provide(VocabularyRepository.layer));
}
