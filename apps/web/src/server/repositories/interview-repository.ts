import { DB } from "@project/db";
import { user } from "@project/db/schema/auth";
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
  CompanyActiveInterviewDetail,
  CompanyCompletedInterviewLedgerEntry,
  CompanyInterviewTag,
  CvProfile,
  CvProfileType,
  GlobalInterviewTag,
  Interview,
  Student,
  encodeCvProfilePresentationCode,
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

const toStudent = (input: {
  readonly row: typeof student.$inferSelect;
  readonly image: string | null;
}) =>
  new Student({
    id: input.row.id as Student["id"],
    firstName: input.row.firstName,
    lastName: input.row.lastName,
    phoneNumber: input.row.phoneNumber,
    academicYear: input.row.academicYear,
    major: input.row.major,
    institution: input.row.institution,
    image: input.image,
  });

const toCvProfile = (row: typeof cvProfile.$inferSelect) =>
  new CvProfile({
    id: row.id as CvProfile["id"],
    studentId: row.studentId as CvProfile["studentId"],
    presentationCode: encodeCvProfilePresentationCode(row.id),
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
    readonly getActiveDetailByCompanyId: (input: {
      readonly companyId: string;
      readonly interviewId: string;
    }) => Effect.Effect<CompanyActiveInterviewDetail | null>;
    readonly createStarted: (input: {
      readonly companyId: string;
      readonly studentId: string;
      readonly cvProfileId: string;
      readonly recruiterName: string;
    }) => Effect.Effect<Interview>;
    readonly completeActive: (input: {
      readonly companyId: string;
      readonly interviewId: string;
      readonly score: number;
      readonly globalTagIds: ReadonlyArray<string>;
      readonly companyTagLabels: ReadonlyArray<string>;
      readonly notes: string;
    }) => Effect.Effect<Interview | null>;
    readonly cancelActive: (input: {
      readonly companyId: string;
      readonly interviewId: string;
      readonly notes: string;
    }) => Effect.Effect<Interview | null>;
  }
>()("@project/web/InterviewRepository") {
  static readonly layer = Layer.effect(
    InterviewRepository,
    Effect.gen(function*() {
      const db = yield* DB;

      const loadByCompanyId = (input: {
        readonly companyId: string;
        readonly interviewId?: string;
        readonly status?: Interview["status"];
      }) =>
        Effect.gen(function*() {
          const whereClause = and(
            eq(interviewTable.companyId, input.companyId),
            ...(input.interviewId
              ? [eq(interviewTable.id, input.interviewId)]
              : []),
            ...(input.status ? [eq(interviewTable.status, input.status)] : []),
          );
          const rows = yield* Effect.promise(() =>
            db
              .select()
              .from(interviewTable)
              .where(whereClause)
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
              .select({
                studentRow: student,
                image: user.image,
              })
              .from(student)
              .innerJoin(user, eq(user.id, student.ownerUserId))
              .where(inArray(student.id, completedRows.map((row) => row.studentId))),
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
          const studentsById = new Map(
            studentRows.map((row) => [row.studentRow.id, row]),
          );
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
              student: toStudent({
                row: studentRow.studentRow,
                image: studentRow.image,
              }),
              cvProfile: toCvProfile(cvProfileRow),
            });
          });
        });

      const loadActiveDetailByCompanyId = (input: {
        readonly companyId: string;
        readonly interviewId: string;
      }) =>
        Effect.gen(function*() {
          const interview = yield* loadOneByCompanyId({
            companyId: input.companyId,
            interviewId: input.interviewId,
          });

          if (!interview || interview.status !== "active") {
            return null;
          }

          const [studentRow, cvProfileRow] = yield* Effect.all([
            Effect.promise(() =>
              db
                .select({
                  studentRow: student,
                  image: user.image,
                })
                .from(student)
                .innerJoin(user, eq(user.id, student.ownerUserId))
                .where(eq(student.id, interview.studentId))
                .limit(1)
                .then((rows) => rows[0] ?? null),
            ),
            Effect.promise(() =>
              db
                .select()
                .from(cvProfile)
                .where(eq(cvProfile.id, interview.cvProfileId))
                .limit(1)
                .then((rows) => rows[0] ?? null),
            ),
          ]);

          if (!studentRow || !cvProfileRow) {
            return yield* Effect.die("Active interview detail query returned incomplete rows");
          }

          return new CompanyActiveInterviewDetail({
            interview,
            student: toStudent({
              row: studentRow.studentRow,
              image: studentRow.image,
            }),
            cvProfile: toCvProfile(cvProfileRow),
          });
        });

      return InterviewRepository.of({
        listByCompanyId: (companyId) =>
          loadByCompanyId({
            companyId,
            status: "active",
          }),
        listCompletedLedgerByCompanyId: loadCompletedLedgerByCompanyId,
        getActiveDetailByCompanyId: loadActiveDetailByCompanyId,
        createStarted: ({
          companyId,
          studentId,
          cvProfileId,
          recruiterName,
        }) =>
          Effect.gen(function*() {
            const interviewId = makeInterviewId();

            yield* Effect.promise(() =>
              db.insert(interviewTable).values({
                id: interviewId,
                companyId,
                studentId,
                cvProfileId,
                recruiterName,
                status: "active",
                score: null,
                notes: "",
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
        completeActive: ({
          companyId,
          interviewId,
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

                const existingInterview = await tx
                  .select()
                  .from(interviewTable)
                  .where(
                    and(
                      eq(interviewTable.companyId, companyId),
                      eq(interviewTable.id, interviewId),
                      eq(interviewTable.status, "active"),
                    ),
                  )
                  .limit(1)
                  .then((rows) => rows[0] ?? null);

                if (!existingInterview) {
                  return null;
                }

                await tx
                  .update(interviewTable)
                  .set({
                    status: "completed",
                    score,
                    notes,
                  })
                  .where(eq(interviewTable.id, interviewId));

                await tx
                  .delete(interviewGlobalTag)
                  .where(eq(interviewGlobalTag.interviewId, interviewId));
                await tx
                  .delete(interviewCompanyTag)
                  .where(eq(interviewCompanyTag.interviewId, interviewId));

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

                return existingInterview.id;
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
        cancelActive: ({ companyId, interviewId, notes }) =>
          Effect.gen(function*() {
            const updatedRows = yield* Effect.promise(() =>
              db
                .update(interviewTable)
                .set({
                  status: "cancelled",
                  score: null,
                  notes,
                })
                .where(
                  and(
                    eq(interviewTable.companyId, companyId),
                    eq(interviewTable.id, interviewId),
                    eq(interviewTable.status, "active"),
                  ),
                )
                .returning({ id: interviewTable.id }),
            );

            if (updatedRows.length === 0) {
              return null;
            }

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
