import {
  DB,
} from "@project/db";
import {
  cvProfileType,
  globalInterviewTag,
  studentInstitution,
  studentMajor,
} from "@project/db/schema/vocabulary";
import {
  ControlledVocabularies,
  CvProfileType,
  GlobalInterviewTag,
  StudentInstitution,
  StudentMajor,
} from "@project/domain";
import { asc } from "drizzle-orm";
import { Effect, Layer, ServiceMap } from "effect";

type VocabularyEntry = {
  readonly id: string;
  readonly label: string;
};

const toCvProfileType = (row: typeof cvProfileType.$inferSelect) =>
  new CvProfileType({
    id: row.id as CvProfileType["id"],
    label: row.label,
  });

const toGlobalInterviewTag = (row: typeof globalInterviewTag.$inferSelect) =>
  new GlobalInterviewTag({
    id: row.id as GlobalInterviewTag["id"],
    label: row.label,
  });

const toStudentMajor = (row: typeof studentMajor.$inferSelect) =>
  new StudentMajor({
    id: row.id as StudentMajor["id"],
    label: row.label,
  });

const toStudentInstitution = (row: typeof studentInstitution.$inferSelect) =>
  new StudentInstitution({
    id: row.id as StudentInstitution["id"],
    label: row.label,
  });

export class VocabularyRepository extends ServiceMap.Service<
  VocabularyRepository,
  {
    readonly listCvProfileTypes: () => Effect.Effect<
      ReadonlyArray<CvProfileType>
    >;
    readonly listGlobalInterviewTags: () => Effect.Effect<
      ReadonlyArray<GlobalInterviewTag>
    >;
    readonly listStudentMajors: () => Effect.Effect<ReadonlyArray<StudentMajor>>;
    readonly listStudentInstitutions: () => Effect.Effect<
      ReadonlyArray<StudentInstitution>
    >;
    readonly addCvProfileType: (
      entry: VocabularyEntry,
    ) => Effect.Effect<ReadonlyArray<CvProfileType>>;
    readonly deleteCvProfileType: (
      id: string,
    ) => Effect.Effect<ReadonlyArray<CvProfileType>>;
    readonly replaceCvProfileTypes: (
      entries: ReadonlyArray<VocabularyEntry>,
    ) => Effect.Effect<ReadonlyArray<CvProfileType>>;
    readonly addGlobalInterviewTag: (
      entry: VocabularyEntry,
    ) => Effect.Effect<ReadonlyArray<GlobalInterviewTag>>;
    readonly deleteGlobalInterviewTag: (
      id: string,
    ) => Effect.Effect<ReadonlyArray<GlobalInterviewTag>>;
    readonly replaceGlobalInterviewTags: (
      entries: ReadonlyArray<VocabularyEntry>,
    ) => Effect.Effect<ReadonlyArray<GlobalInterviewTag>>;
    readonly addStudentMajor: (
      entry: VocabularyEntry,
    ) => Effect.Effect<ReadonlyArray<StudentMajor>>;
    readonly deleteStudentMajor: (
      id: string,
    ) => Effect.Effect<ReadonlyArray<StudentMajor>>;
    readonly replaceStudentMajors: (
      entries: ReadonlyArray<VocabularyEntry>,
    ) => Effect.Effect<ReadonlyArray<StudentMajor>>;
    readonly addStudentInstitution: (
      entry: VocabularyEntry,
    ) => Effect.Effect<ReadonlyArray<StudentInstitution>>;
    readonly deleteStudentInstitution: (
      id: string,
    ) => Effect.Effect<ReadonlyArray<StudentInstitution>>;
    readonly replaceStudentInstitutions: (
      entries: ReadonlyArray<VocabularyEntry>,
    ) => Effect.Effect<ReadonlyArray<StudentInstitution>>;
    readonly seedControlledVocabularies: (
      input: {
        readonly cvProfileTypes: ReadonlyArray<VocabularyEntry>;
        readonly globalInterviewTags: ReadonlyArray<VocabularyEntry>;
        readonly studentInstitutions: ReadonlyArray<VocabularyEntry>;
        readonly studentMajors: ReadonlyArray<VocabularyEntry>;
      },
    ) => Effect.Effect<ControlledVocabularies>;
  }
>()("@project/web/VocabularyRepository") {
  static readonly layer = Layer.effect(
    VocabularyRepository,
    Effect.gen(function*() {
      const db = yield* DB;

      const listCvProfileTypes = () =>
        Effect.promise(() =>
          db
            .select()
            .from(cvProfileType)
            .orderBy(asc(cvProfileType.sortOrder), asc(cvProfileType.id))
            .then((rows) => rows.map(toCvProfileType)),
        );

      const listGlobalInterviewTags = () =>
        Effect.promise(() =>
          db
            .select()
            .from(globalInterviewTag)
            .orderBy(
              asc(globalInterviewTag.sortOrder),
              asc(globalInterviewTag.id),
            )
            .then((rows) => rows.map(toGlobalInterviewTag)),
        );

      const listStudentMajors = () =>
        Effect.promise(() =>
          db
            .select()
            .from(studentMajor)
            .orderBy(asc(studentMajor.sortOrder), asc(studentMajor.id))
            .then((rows) => rows.map(toStudentMajor)),
        );

      const listStudentInstitutions = () =>
        Effect.promise(() =>
          db
            .select()
            .from(studentInstitution)
            .orderBy(asc(studentInstitution.sortOrder), asc(studentInstitution.id))
            .then((rows) => rows.map(toStudentInstitution)),
        );

      const replaceCvProfileTypes = (
        entries: ReadonlyArray<VocabularyEntry>,
      ) =>
        Effect.gen(function*() {
          yield* Effect.promise(() =>
            db.transaction(async (tx) => {
              await tx.delete(cvProfileType);

              if (entries.length > 0) {
                await tx.insert(cvProfileType).values(
                  entries.map((entry, sortOrder) => ({
                    id: entry.id,
                    label: entry.label,
                    sortOrder,
                  })),
                );
              }
            }),
          );

          return yield* listCvProfileTypes();
        });

      const replaceGlobalInterviewTags = (
        entries: ReadonlyArray<VocabularyEntry>,
      ) =>
        Effect.gen(function*() {
          yield* Effect.promise(() =>
            db.transaction(async (tx) => {
              await tx.delete(globalInterviewTag);

              if (entries.length > 0) {
                await tx.insert(globalInterviewTag).values(
                  entries.map((entry, sortOrder) => ({
                    id: entry.id,
                    label: entry.label,
                    sortOrder,
                  })),
                );
              }
            }),
          );

          return yield* listGlobalInterviewTags();
        });

      const replaceStudentMajors = (
        entries: ReadonlyArray<VocabularyEntry>,
      ) =>
        Effect.gen(function*() {
          yield* Effect.promise(() =>
            db.transaction(async (tx) => {
              await tx.delete(studentMajor);

              if (entries.length > 0) {
                await tx.insert(studentMajor).values(
                  entries.map((entry, sortOrder) => ({
                    id: entry.id,
                    label: entry.label,
                    sortOrder,
                  })),
                );
              }
            }),
          );

          return yield* listStudentMajors();
        });

      const replaceStudentInstitutions = (
        entries: ReadonlyArray<VocabularyEntry>,
      ) =>
        Effect.gen(function*() {
          yield* Effect.promise(() =>
            db.transaction(async (tx) => {
              await tx.delete(studentInstitution);

              if (entries.length > 0) {
                await tx.insert(studentInstitution).values(
                  entries.map((entry, sortOrder) => ({
                    id: entry.id,
                    label: entry.label,
                    sortOrder,
                  })),
                );
              }
            }),
          );

          return yield* listStudentInstitutions();
        });

      return VocabularyRepository.of({
        listCvProfileTypes,
        listGlobalInterviewTags,
        listStudentInstitutions,
        listStudentMajors,
        addCvProfileType: (entry) =>
          Effect.gen(function*() {
            const currentEntries = yield* listCvProfileTypes();

            return yield* replaceCvProfileTypes([...currentEntries, entry]);
          }),
        deleteCvProfileType: (id) =>
          Effect.gen(function*() {
            const currentEntries = yield* listCvProfileTypes();

            return yield* replaceCvProfileTypes(
              currentEntries.filter((entry) => entry.id !== id),
            );
          }),
        replaceCvProfileTypes,
        addGlobalInterviewTag: (entry) =>
          Effect.gen(function*() {
            const currentEntries = yield* listGlobalInterviewTags();

            return yield* replaceGlobalInterviewTags([...currentEntries, entry]);
          }),
        deleteGlobalInterviewTag: (id) =>
          Effect.gen(function*() {
            const currentEntries = yield* listGlobalInterviewTags();

            return yield* replaceGlobalInterviewTags(
              currentEntries.filter((entry) => entry.id !== id),
            );
          }),
        replaceGlobalInterviewTags,
        addStudentMajor: (entry) =>
          Effect.gen(function*() {
            const currentEntries = yield* listStudentMajors();

            return yield* replaceStudentMajors([...currentEntries, entry]);
          }),
        deleteStudentMajor: (id) =>
          Effect.gen(function*() {
            const currentEntries = yield* listStudentMajors();

            return yield* replaceStudentMajors(
              currentEntries.filter((entry) => entry.id !== id),
            );
          }),
        replaceStudentMajors,
        addStudentInstitution: (entry) =>
          Effect.gen(function*() {
            const currentEntries = yield* listStudentInstitutions();

            return yield* replaceStudentInstitutions([...currentEntries, entry]);
          }),
        deleteStudentInstitution: (id) =>
          Effect.gen(function*() {
            const currentEntries = yield* listStudentInstitutions();

            return yield* replaceStudentInstitutions(
              currentEntries.filter((entry) => entry.id !== id),
            );
          }),
        replaceStudentInstitutions,
        seedControlledVocabularies: ({ cvProfileTypes, globalInterviewTags, studentInstitutions, studentMajors }) =>
          Effect.gen(function*() {
            yield* Effect.promise(() =>
              db.transaction(async (tx) => {
                await tx.delete(studentInstitution);
                await tx.delete(studentMajor);
                await tx.delete(globalInterviewTag);
                await tx.delete(cvProfileType);

                if (cvProfileTypes.length > 0) {
                  await tx.insert(cvProfileType).values(
                    cvProfileTypes.map((entry, sortOrder) => ({
                      id: entry.id,
                      label: entry.label,
                      sortOrder,
                    })),
                  );
                }

                if (globalInterviewTags.length > 0) {
                  await tx.insert(globalInterviewTag).values(
                    globalInterviewTags.map((entry, sortOrder) => ({
                      id: entry.id,
                      label: entry.label,
                      sortOrder,
                    })),
                  );
                }

                if (studentMajors.length > 0) {
                  await tx.insert(studentMajor).values(
                    studentMajors.map((entry, sortOrder) => ({
                      id: entry.id,
                      label: entry.label,
                      sortOrder,
                    })),
                  );
                }

                if (studentInstitutions.length > 0) {
                  await tx.insert(studentInstitution).values(
                    studentInstitutions.map((entry, sortOrder) => ({
                      id: entry.id,
                      label: entry.label,
                      sortOrder,
                    })),
                  );
                }
              }),
            );

            return new ControlledVocabularies({
              cvProfileTypes: yield* listCvProfileTypes(),
              globalInterviewTags: yield* listGlobalInterviewTags(),
              studentInstitutions: yield* listStudentInstitutions(),
              studentMajors: yield* listStudentMajors(),
            });
          }),
      });
    }),
  );
}
