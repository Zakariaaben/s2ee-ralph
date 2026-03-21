import { DB } from "@project/db";
import { cvProfile } from "@project/db/schema/cv-profile";
import { cvProfileType } from "@project/db/schema/vocabulary";
import { CvProfile, CvProfileFile, CvProfileType } from "@project/domain";
import { ServerEnv } from "@project/env/server";
import { and, asc, eq } from "drizzle-orm";
import { Effect, Layer, Redacted, ServiceMap } from "effect";

const makeCvProfileId = () => crypto.randomUUID();

const makeStorageKey = (input: {
  readonly studentId: string;
  readonly cvProfileId: string;
  readonly fileName: string;
}) =>
  `student-cv-profiles/${input.studentId}/${input.cvProfileId}/${encodeURIComponent(input.fileName)}`;

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

export class CvProfileRepository extends ServiceMap.Service<
  CvProfileRepository,
  {
    readonly listByStudentId: (
      studentId: string,
    ) => Effect.Effect<ReadonlyArray<CvProfile>>;
    readonly createForStudent: (input: {
      readonly studentId: string;
      readonly profileTypeId: string;
      readonly fileName: string;
      readonly contentType: string;
      readonly contents: Uint8Array;
    }) => Effect.Effect<CvProfile | null>;
    readonly downloadForStudent: (input: {
      readonly studentId: string;
      readonly cvProfileId: string;
    }) => Effect.Effect<CvProfileFile | null>;
    readonly deleteForStudent: (input: {
      readonly studentId: string;
      readonly cvProfileId: string;
    }) => Effect.Effect<boolean>;
  }
>()("@project/web/CvProfileRepository") {
  static readonly layer = Layer.effect(
    CvProfileRepository,
    Effect.gen(function*() {
      const db = yield* DB;
      const env = yield* ServerEnv;

      const s3 = new Bun.S3Client({
        accessKeyId: Redacted.value(env.s3AccessKeyId),
        secretAccessKey: Redacted.value(env.s3SecretAccessKey),
        bucket: env.s3Bucket,
        endpoint: env.s3Endpoint.toString(),
        region: env.s3Region,
      });

      const getProfileTypeRow = (profileTypeId: string) =>
        Effect.promise(() =>
          db
            .select()
            .from(cvProfileType)
            .where(eq(cvProfileType.id, profileTypeId))
            .limit(1)
            .then((rows) => rows[0] ?? null),
        );

      const getCvProfileRow = (input: {
        readonly studentId: string;
        readonly cvProfileId: string;
      }) =>
        Effect.promise(() =>
          db
            .select()
            .from(cvProfile)
            .where(
              and(
                eq(cvProfile.studentId, input.studentId),
                eq(cvProfile.id, input.cvProfileId),
              ),
            )
            .limit(1)
            .then((rows) => rows[0] ?? null),
        );

      const listByStudentId = (studentId: string) =>
        Effect.promise(() =>
          db
            .select()
            .from(cvProfile)
            .where(eq(cvProfile.studentId, studentId))
            .orderBy(asc(cvProfile.createdAt), asc(cvProfile.id))
            .then((rows) => rows.map(toCvProfile)),
        );

      return CvProfileRepository.of({
        listByStudentId,
        createForStudent: ({ studentId, profileTypeId, fileName, contentType, contents }) =>
          Effect.gen(function*() {
            const profileTypeRow = yield* getProfileTypeRow(profileTypeId);

            if (!profileTypeRow) {
              return null;
            }

            const cvProfileId = makeCvProfileId();
            const storageKey = makeStorageKey({
              studentId,
              cvProfileId,
              fileName,
            });
            const file = s3.file(storageKey);

            yield* Effect.promise(() => file.write(contents));

            const insertExit = yield* Effect.exit(
              Effect.promise(() =>
                db.insert(cvProfile).values({
                  id: cvProfileId,
                  studentId,
                  profileTypeId: profileTypeRow.id,
                  profileTypeLabel: profileTypeRow.label,
                  fileName,
                  contentType,
                  fileSizeBytes: contents.byteLength,
                  storageKey,
                }),
              ),
            );

            if (insertExit._tag === "Failure") {
              yield* Effect.promise(() => file.delete()).pipe(Effect.ignore);
              return yield* Effect.failCause(insertExit.cause);
            }

            const savedCvProfile = yield* getCvProfileRow({
              studentId,
              cvProfileId,
            });

            if (!savedCvProfile) {
              return yield* Effect.die("CV profile insert did not return a profile");
            }

            return toCvProfile(savedCvProfile);
          }),
        downloadForStudent: ({ studentId, cvProfileId }) =>
          Effect.gen(function*() {
            const cvProfileRow = yield* getCvProfileRow({
              studentId,
              cvProfileId,
            });

            if (!cvProfileRow) {
              return null;
            }

            const file = s3.file(cvProfileRow.storageKey);
            const contents = yield* Effect.promise(() => file.arrayBuffer());

            return new CvProfileFile({
              cvProfileId: cvProfileRow.id as CvProfileFile["cvProfileId"],
              fileName: cvProfileRow.fileName,
              contentType: cvProfileRow.contentType,
              contentsBase64: Buffer.from(contents).toString("base64"),
            });
          }),
        deleteForStudent: ({ studentId, cvProfileId }) =>
          Effect.gen(function*() {
            const cvProfileRow = yield* getCvProfileRow({
              studentId,
              cvProfileId,
            });

            if (!cvProfileRow) {
              return false;
            }

            yield* Effect.promise(() =>
              db.delete(cvProfile).where(
                and(
                  eq(cvProfile.studentId, studentId),
                  eq(cvProfile.id, cvProfileId),
                ),
              ),
            );
            yield* Effect.promise(() => s3.file(cvProfileRow.storageKey).delete()).pipe(
              Effect.ignore,
            );

            return true;
          }),
      });
    }),
  );
}
