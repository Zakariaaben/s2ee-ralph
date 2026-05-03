import {
  type AuthenticatedActor,
  ControlledVocabularies,
  type CvProfileType,
  type GlobalInterviewTag,
  type StudentInstitution,
  type StudentMajor,
} from "@project/domain";
import { Effect, Layer, ServiceMap } from "effect";
import * as HttpApiError from "effect/unstable/httpapi/HttpApiError";

import { VocabularyRepository } from "../repositories/vocabulary-repository";

type VocabularyEntry = {
  readonly id: string;
  readonly label: string;
};

type VocabularyEntryIdentity = {
  readonly id: string;
};

const requireAdminActor = (actor: AuthenticatedActor) =>
  Effect.gen(function*() {
    if (actor.role !== "admin") {
      yield* new HttpApiError.Forbidden({});
    }

    return actor;
  });

const ensureEntryAbsent = (
  id: string,
  entries: ReadonlyArray<VocabularyEntryIdentity>,
) =>
  Effect.gen(function*() {
    if (entries.some((entry) => entry.id === id)) {
      yield* new HttpApiError.BadRequest({});
    }
  });

const ensureEntryPresent = (
  id: string,
  entries: ReadonlyArray<VocabularyEntryIdentity>,
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
    readonly listStudentMajors: (
      actor: AuthenticatedActor,
    ) => Effect.Effect<ReadonlyArray<StudentMajor>, HttpApiError.Unauthorized>;
    readonly listStudentInstitutions: (
      actor: AuthenticatedActor,
    ) => Effect.Effect<ReadonlyArray<StudentInstitution>, HttpApiError.Unauthorized>;
    readonly seedControlledVocabularies: (
      input: {
        readonly actor: AuthenticatedActor;
        readonly cvProfileTypes: ReadonlyArray<VocabularyEntry>;
        readonly globalInterviewTags: ReadonlyArray<VocabularyEntry>;
        readonly studentInstitutions: ReadonlyArray<VocabularyEntry>;
        readonly studentMajors: ReadonlyArray<VocabularyEntry>;
      },
    ) => Effect.Effect<
      ControlledVocabularies,
      HttpApiError.Forbidden | HttpApiError.BadRequest
    >;
    readonly addCvProfileType: (
      input: {
        readonly actor: AuthenticatedActor;
        readonly entry: VocabularyEntry;
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
        readonly entries: ReadonlyArray<VocabularyEntry>;
      },
    ) => Effect.Effect<
      ReadonlyArray<CvProfileType>,
      HttpApiError.Forbidden | HttpApiError.BadRequest
    >;
    readonly addGlobalInterviewTag: (
      input: {
        readonly actor: AuthenticatedActor;
        readonly entry: VocabularyEntry;
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
        readonly entries: ReadonlyArray<VocabularyEntry>;
      },
    ) => Effect.Effect<
      ReadonlyArray<GlobalInterviewTag>,
      HttpApiError.Forbidden | HttpApiError.BadRequest
    >;
    readonly addStudentMajor: (
      input: {
        readonly actor: AuthenticatedActor;
        readonly entry: VocabularyEntry;
      },
    ) => Effect.Effect<ReadonlyArray<StudentMajor>, HttpApiError.Forbidden | HttpApiError.BadRequest>;
    readonly deleteStudentMajor: (
      input: {
        readonly actor: AuthenticatedActor;
        readonly id: string;
      },
    ) => Effect.Effect<ReadonlyArray<StudentMajor>, HttpApiError.Forbidden | HttpApiError.BadRequest>;
    readonly replaceStudentMajors: (
      input: {
        readonly actor: AuthenticatedActor;
        readonly entries: ReadonlyArray<VocabularyEntry>;
      },
    ) => Effect.Effect<ReadonlyArray<StudentMajor>, HttpApiError.Forbidden | HttpApiError.BadRequest>;
    readonly addStudentInstitution: (
      input: {
        readonly actor: AuthenticatedActor;
        readonly entry: VocabularyEntry;
      },
    ) => Effect.Effect<ReadonlyArray<StudentInstitution>, HttpApiError.Forbidden | HttpApiError.BadRequest>;
    readonly deleteStudentInstitution: (
      input: {
        readonly actor: AuthenticatedActor;
        readonly id: string;
      },
    ) => Effect.Effect<ReadonlyArray<StudentInstitution>, HttpApiError.Forbidden | HttpApiError.BadRequest>;
    readonly replaceStudentInstitutions: (
      input: {
        readonly actor: AuthenticatedActor;
        readonly entries: ReadonlyArray<VocabularyEntry>;
      },
    ) => Effect.Effect<ReadonlyArray<StudentInstitution>, HttpApiError.Forbidden | HttpApiError.BadRequest>;
  }
>()("@project/web/VocabularyService") {
  static readonly layer = Layer.effect(
    VocabularyService,
    Effect.gen(function*() {
      const vocabularyRepository = yield* VocabularyRepository;

      return VocabularyService.of({
        listCvProfileTypes: (actor) =>
          Effect.gen(function*() {
            void actor;

            return yield* vocabularyRepository.listCvProfileTypes();
          }),
        listGlobalInterviewTags: (actor) =>
          Effect.gen(function*() {
            void actor;

            return yield* vocabularyRepository.listGlobalInterviewTags();
          }),
        listStudentMajors: (actor) =>
          Effect.gen(function*() {
            void actor;

            return yield* vocabularyRepository.listStudentMajors();
          }),
        listStudentInstitutions: (actor) =>
          Effect.gen(function*() {
            void actor;

            return yield* vocabularyRepository.listStudentInstitutions();
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
        addStudentMajor: ({ actor, entry }) =>
          Effect.gen(function*() {
            yield* requireAdminActor(actor);

            const existing = yield* vocabularyRepository.listStudentMajors();

            yield* ensureEntryAbsent(entry.id, existing);

            return yield* vocabularyRepository.addStudentMajor(entry);
          }),
        deleteStudentMajor: ({ actor, id }) =>
          Effect.gen(function*() {
            yield* requireAdminActor(actor);

            const existing = yield* vocabularyRepository.listStudentMajors();

            yield* ensureEntryPresent(id, existing);

            return yield* vocabularyRepository.deleteStudentMajor(id);
          }),
        replaceStudentMajors: ({ actor, entries }) =>
          Effect.gen(function*() {
            yield* requireAdminActor(actor);

            return yield* vocabularyRepository.replaceStudentMajors(entries);
          }),
        addStudentInstitution: ({ actor, entry }) =>
          Effect.gen(function*() {
            yield* requireAdminActor(actor);

            const existing = yield* vocabularyRepository.listStudentInstitutions();

            yield* ensureEntryAbsent(entry.id, existing);

            return yield* vocabularyRepository.addStudentInstitution(entry);
          }),
        deleteStudentInstitution: ({ actor, id }) =>
          Effect.gen(function*() {
            yield* requireAdminActor(actor);

            const existing = yield* vocabularyRepository.listStudentInstitutions();

            yield* ensureEntryPresent(id, existing);

            return yield* vocabularyRepository.deleteStudentInstitution(id);
          }),
        replaceStudentInstitutions: ({ actor, entries }) =>
          Effect.gen(function*() {
            yield* requireAdminActor(actor);

            return yield* vocabularyRepository.replaceStudentInstitutions(entries);
          }),
        seedControlledVocabularies: ({
          actor,
          cvProfileTypes,
          globalInterviewTags,
          studentInstitutions,
          studentMajors,
        }) =>
          Effect.gen(function*() {
            yield* requireAdminActor(actor);

            return yield* vocabularyRepository.seedControlledVocabularies({
              cvProfileTypes,
              globalInterviewTags,
              studentInstitutions,
              studentMajors,
            });
          }),
      });
    }),
  ).pipe(Layer.provide(VocabularyRepository.layer));
}
