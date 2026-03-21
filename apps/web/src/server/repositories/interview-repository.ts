import { DB } from "@project/db";
import {
  companyInterviewTag,
  interview as interviewTable,
  interviewCompanyTag,
  interviewGlobalTag,
} from "@project/db/schema/interview";
import { globalInterviewTag } from "@project/db/schema/vocabulary";
import {
  CompanyInterviewTag,
  GlobalInterviewTag,
  Interview,
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

export class InterviewRepository extends ServiceMap.Service<
  InterviewRepository,
  {
    readonly listByCompanyId: (
      companyId: string,
    ) => Effect.Effect<ReadonlyArray<Interview>>;
    readonly createCompleted: (input: {
      readonly companyId: string;
      readonly studentId: string;
      readonly cvProfileId: string;
      readonly recruiterName: string;
      readonly score: number;
      readonly globalTagIds: ReadonlyArray<string>;
      readonly companyTagLabels: ReadonlyArray<string>;
    }) => Effect.Effect<Interview | null>;
    readonly createCancelled: (input: {
      readonly companyId: string;
      readonly studentId: string;
      readonly cvProfileId: string;
      readonly recruiterName: string;
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

      return InterviewRepository.of({
        listByCompanyId: (companyId) =>
          loadByCompanyId({
            companyId,
          }),
        createCompleted: ({
          companyId,
          studentId,
          cvProfileId,
          recruiterName,
          score,
          globalTagIds,
          companyTagLabels,
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
        createCancelled: ({ companyId, studentId, cvProfileId, recruiterName }) =>
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
