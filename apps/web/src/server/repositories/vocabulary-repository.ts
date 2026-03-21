import {
  DB,
} from "@project/db";
import {
  cvProfileType,
  globalInterviewTag,
} from "@project/db/schema/vocabulary";
import {
  ControlledVocabularies,
  CvProfileType,
  GlobalInterviewTag,
} from "@project/domain";
import { asc } from "drizzle-orm";
import { Effect, Layer, ServiceMap } from "effect";

type SeedVocabularyEntry = {
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

export class VocabularyRepository extends ServiceMap.Service<
  VocabularyRepository,
  {
    readonly listCvProfileTypes: () => Effect.Effect<
      ReadonlyArray<CvProfileType>
    >;
    readonly listGlobalInterviewTags: () => Effect.Effect<
      ReadonlyArray<GlobalInterviewTag>
    >;
    readonly seedControlledVocabularies: (
      input: {
        readonly cvProfileTypes: ReadonlyArray<SeedVocabularyEntry>;
        readonly globalInterviewTags: ReadonlyArray<SeedVocabularyEntry>;
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

      return VocabularyRepository.of({
        listCvProfileTypes,
        listGlobalInterviewTags,
        seedControlledVocabularies: ({ cvProfileTypes, globalInterviewTags }) =>
          Effect.gen(function*() {
            yield* Effect.promise(() =>
              db.transaction(async (tx) => {
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
              }),
            );

            return new ControlledVocabularies({
              cvProfileTypes: yield* listCvProfileTypes(),
              globalInterviewTags: yield* listGlobalInterviewTags(),
            });
          }),
      });
    }),
  );
}
