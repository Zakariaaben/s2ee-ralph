import { DB } from "@project/db";
import { cvProfile } from "@project/db/schema/cv-profile";
import {
  companyInterviewTag,
  interview as interviewTable,
  interviewCompanyTag,
  interviewGlobalTag,
} from "@project/db/schema/interview";
import { student } from "@project/db/schema/student";
import { globalInterviewTag } from "@project/db/schema/vocabulary";
import {
  CompanyCompletedInterviewLedgerEntry,
  CompanyInterviewTag,
  CvProfile,
  CvProfileType,
  GlobalInterviewTag,
  Interview,
  Student,
} from "@project/domain";
import { and, asc, eq, inArray } from "drizzle-orm";
import { Effect, Layer, ServiceMap } from "effect";

const makeInterviewId = () => crypto.randomUUID();
const makeCompanyInterviewTagId = () => crypto.randomUUID();

const toInterview = (input: {
  readonly row: typeof interviewTable.$inferSelect;
  readonly globalTags: ReadonlyArray<typeof interviewGlobalTag.$inferSelect>;
  readonly companyTags: ReadonlyArray<typeof interviewCompanyTag.$inferSelect>;
}) =>
  new Interview({
    id: input.row.id as Interview["id"],
    companyId: input.row.companyId as Interview["companyId"],
    studentId: input.row.studentId as Interview["studentId"],
    cvProfileId: input.row.cvProfileId as Interview["cvProfileId"],
    recruiterName: input.row.recruiterName,
    status: input.row.status,
    score: input.row.score ?? null,
    notes: input.row.notes,
    globalTags: input.globalTags.map(
      (row) =>
        new GlobalInterviewTag({
          id: row.globalTagId as GlobalInterviewTag["id"],
          label: row.globalTagLabel,
        }),
    ),
    companyTags: input.companyTags.map(
      (row) =>
        new CompanyInterviewTag({
          id: row.companyTagId as CompanyInterviewTag["id"],
          label: row.companyTagLabel,
        }),
    ),
  });

const toStudent = (row: typeof student.$inferSelect) =>
  new Student({
    id: row.id as Student["id"],
    firstName: row.firstName,
    lastName: row.lastName,
    course: row.course,
  });

const toCvProfile = (row: typeof cvProfile.$inferSelect) =>
  new CvProfile({
    id: row.id as CvProfile["id"],
    studentId: row.studentId as CvProfile["studentId"],
    profileType: new CvProfileType({
      id: row.profileTypeId as CvProfileType["id"],
      label: row.profileTypeLabel,
    }),
    fileName: row.fileName,
    contentType: row.contentType,
    fileSizeBytes: row.fileSizeBytes,
  });

export class InterviewRepository extends ServiceMap.Service<
  InterviewRepository,
  {
    readonly listByCompanyId: (
      companyId: string,
    ) => Effect.Effect<ReadonlyArray<Interview>>;
    readonly listCompletedLedgerByCompanyId: (
      companyId: string,
    ) => Effect.Effect<ReadonlyArray<CompanyCompletedInterviewLedgerEntry>>;
    readonly createCompleted: (input: {
      readonly companyId: string;
      readonly studentId: string;
      readonly cvProfileId: string;
      readonly recruiterName: string;
      readonly score: number;
      readonly globalTagIds: ReadonlyArray<string>;
      readonly companyTagLabels: ReadonlyArray<string>;
      readonly notes: string;
    }) => Effect.Effect<Interview | null>;
    readonly createCancelled: (input: {
      readonly companyId: string;
      readonly studentId: string;
      readonly cvProfileId: string;
      readonly recruiterName: string;
      readonly notes: string;
    }) => Effect.Effect<Interview>;
  }
>()("@project/web/InterviewRepository") {
  static readonly layer = Layer.effect(
    InterviewRepository,
    Effect.gen(function*() {
      const db = yield* DB;

      const loadByCompanyId = (input: {
        readonly companyId: string;
        readonly interviewId?: string;
      }) =>
        Effect.gen(function*() {
          const rows = yield* Effect.promise(() =>
            db
              .select()
              .from(interviewTable)
              .where(
                input.interviewId
                  ? and(
                      eq(interviewTable.companyId, input.companyId),
                      eq(interviewTable.id, input.interviewId),
                    )
                  : eq(interviewTable.companyId, input.companyId),
              )
              .orderBy(asc(interviewTable.createdAt), asc(interviewTable.id)),
          );

          if (rows.length === 0) {
            return [];
          }

          const interviewIds = rows.map((row) => row.id);
          const globalTagRows = yield* Effect.promise(() =>
            db
              .select()
              .from(interviewGlobalTag)
              .where(inArray(interviewGlobalTag.interviewId, interviewIds))
              .orderBy(
                asc(interviewGlobalTag.interviewId),
                asc(interviewGlobalTag.sortOrder),
                asc(interviewGlobalTag.globalTagId),
              ),
          );
          const companyTagRows = yield* Effect.promise(() =>
            db
              .select()
              .from(interviewCompanyTag)
              .where(inArray(interviewCompanyTag.interviewId, interviewIds))
              .orderBy(
                asc(interviewCompanyTag.interviewId),
                asc(interviewCompanyTag.sortOrder),
                asc(interviewCompanyTag.companyTagId),
              ),
          );

          const globalTagsByInterviewId = new Map<
            string,
            Array<typeof interviewGlobalTag.$inferSelect>
          >();
          const companyTagsByInterviewId = new Map<
            string,
            Array<typeof interviewCompanyTag.$inferSelect>
          >();

          for (const row of globalTagRows) {
            const current = globalTagsByInterviewId.get(row.interviewId) ?? [];
            current.push(row);
            globalTagsByInterviewId.set(row.interviewId, current);
          }

          for (const row of companyTagRows) {
            const current = companyTagsByInterviewId.get(row.interviewId) ?? [];
            current.push(row);
            companyTagsByInterviewId.set(row.interviewId, current);
          }

          return rows.map((row) =>
            toInterview({
              row,
              globalTags: globalTagsByInterviewId.get(row.id) ?? [],
              companyTags: companyTagsByInterviewId.get(row.id) ?? [],
            }),
          );
        });

      const loadOneByCompanyId = (input: {
        readonly companyId: string;
        readonly interviewId: string;
      }) =>
        Effect.gen(function*() {
          const interviews = yield* loadByCompanyId(input);

          return interviews[0] ?? null;
        });

      const loadCompletedLedgerByCompanyId = (companyId: string) =>
        Effect.gen(function*() {
          const completedRows = yield* Effect.promise(() =>
            db
              .select()
              .from(interviewTable)
              .where(
                and(
                  eq(interviewTable.companyId, companyId),
                  eq(interviewTable.status, "completed"),
                ),
              )
              .orderBy(asc(interviewTable.createdAt), asc(interviewTable.id)),
          );

          if (completedRows.length === 0) {
            return [];
          }

          const interviews = yield* loadByCompanyId({ companyId });
          const completedInterviewsById = new Map<string, Interview>(
            interviews
              .filter((interview) => interview.status === "completed")
              .map((interview) => [interview.id, interview]),
          );
          const studentRows = yield* Effect.promise(() =>
            db
              .select()
              .from(student)
              .where(
                inArray(
                  student.id,
                  completedRows.map((row) => row.studentId),
                ),
              ),
          );
          const cvProfileRows = yield* Effect.promise(() =>
            db
              .select()
              .from(cvProfile)
              .where(
                inArray(
                  cvProfile.id,
                  completedRows.map((row) => row.cvProfileId),
                ),
              ),
          );
          const studentsById = new Map(studentRows.map((row) => [row.id, row]));
          const cvProfilesById = new Map(cvProfileRows.map((row) => [row.id, row]));

          return completedRows.map((row) => {
            const interview = completedInterviewsById.get(row.id);
            const studentRow = studentsById.get(row.studentId);
            const cvProfileRow = cvProfilesById.get(row.cvProfileId);

            if (!interview || !studentRow || !cvProfileRow) {
              throw new Error("Completed interview ledger query returned incomplete rows");
            }

            return new CompanyCompletedInterviewLedgerEntry({
              interview,
              student: toStudent(studentRow),
              cvProfile: toCvProfile(cvProfileRow),
            });
          });
        });

      return InterviewRepository.of({
        listByCompanyId: (companyId) =>
          loadByCompanyId({
            companyId,
          }),
        listCompletedLedgerByCompanyId: loadCompletedLedgerByCompanyId,
        createCompleted: ({
          companyId,
          studentId,
          cvProfileId,
          recruiterName,
          score,
          globalTagIds,
          companyTagLabels,
          notes,
        }) =>
          Effect.gen(function*() {
            const createdInterviewId = yield* Effect.promise(() =>
              db.transaction(async (tx) => {
                const loadedGlobalTags =
                  globalTagIds.length === 0
                    ? []
                    : await tx
                        .select()
                        .from(globalInterviewTag)
                        .where(inArray(globalInterviewTag.id, [...globalTagIds]));

                if (loadedGlobalTags.length !== globalTagIds.length) {
                  return null;
                }

                const globalTagsById = new Map(
                  loadedGlobalTags.map((row) => [row.id, row]),
                );
                const orderedGlobalTags = globalTagIds.map((id) =>
                  globalTagsById.get(id)!,
                );
                const orderedCompanyTags: Array<
                  typeof companyInterviewTag.$inferSelect
                > = [];

                for (const label of companyTagLabels) {
                  const existing = await tx
                    .select()
                    .from(companyInterviewTag)
                    .where(
                      and(
                        eq(companyInterviewTag.companyId, companyId),
                        eq(companyInterviewTag.label, label),
                      ),
                    )
                    .limit(1)
                    .then((rows) => rows[0] ?? null);

                  if (existing) {
                    orderedCompanyTags.push(existing);
                    continue;
                  }

                  const inserted = await tx
                    .insert(companyInterviewTag)
                    .values({
                      id: makeCompanyInterviewTagId(),
                      companyId,
                      label,
                    })
                    .returning()
                    .then((rows) => rows[0]!);

                  orderedCompanyTags.push(inserted);
                }

                const interviewId = makeInterviewId();

                await tx.insert(interviewTable).values({
                  id: interviewId,
                  companyId,
                  studentId,
                  cvProfileId,
                  recruiterName,
                  status: "completed",
                  score,
                  notes,
                });

                if (orderedGlobalTags.length > 0) {
                  await tx.insert(interviewGlobalTag).values(
                    orderedGlobalTags.map((tag, sortOrder) => ({
                      interviewId,
                      globalTagId: tag.id,
                      globalTagLabel: tag.label,
                      sortOrder,
                    })),
                  );
                }

                if (orderedCompanyTags.length > 0) {
                  await tx.insert(interviewCompanyTag).values(
                    orderedCompanyTags.map((tag, sortOrder) => ({
                      interviewId,
                      companyTagId: tag.id,
                      companyTagLabel: tag.label,
                      sortOrder,
                    })),
                  );
                }

                return interviewId;
              }),
            );

            if (!createdInterviewId) {
              return null;
            }

            const savedInterview = yield* loadOneByCompanyId({
              companyId,
              interviewId: createdInterviewId,
            });

            if (!savedInterview) {
              return yield* Effect.die("Interview insert did not return an interview");
            }

            return savedInterview;
          }),
        createCancelled: ({ companyId, studentId, cvProfileId, recruiterName, notes }) =>
          Effect.gen(function*() {
            const interviewId = makeInterviewId();

            yield* Effect.promise(() =>
              db.insert(interviewTable).values({
                id: interviewId,
                companyId,
                studentId,
                cvProfileId,
                recruiterName,
                status: "cancelled",
                score: null,
                notes,
              }),
            );

            const savedInterview = yield* loadOneByCompanyId({
              companyId,
              interviewId,
            });

            if (!savedInterview) {
              return yield* Effect.die("Interview insert did not return an interview");
            }

            return savedInterview;
          }),
      });
    }),
  );
}
