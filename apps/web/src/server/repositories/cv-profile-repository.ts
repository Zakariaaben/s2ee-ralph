import { DB } from "@project/db";
import { user } from "@project/db/schema/auth";
import { cvProfile } from "@project/db/schema/cv-profile";
import { student } from "@project/db/schema/student";
import { cvProfileType } from "@project/db/schema/vocabulary";
import {
  CvProfile,
  CvProfileDownloadUrl,
  CvProfileFile,
  CvProfileType,
  PresentedCvProfilePreview,
  Student,
  encodeCvProfilePresentationCode,
} from "@project/domain";
import { ServerEnv } from "@project/env/server";
import { and, asc, eq } from "drizzle-orm";
import { Effect, Layer, ServiceMap } from "effect";

import { makeS3StorageClient } from "./s3-storage";

const makeCvProfileId = () => crypto.randomUUID();
const hiddenDefaultCvProfileType = {
  id: "default",
  label: "Default",
} as const;

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
    presentationCode: encodeCvProfilePresentationCode(row.id),
    profileType: new CvProfileType({
      id: row.profileTypeId as CvProfileType["id"],
      label: row.profileTypeLabel,
    }),
    fileName: row.fileName,
    contentType: row.contentType,
    fileSizeBytes: row.fileSizeBytes,
  });

const toStudent = (input: {
  readonly studentRow: typeof student.$inferSelect;
  readonly image: string | null;
}) =>
  new Student({
    id: input.studentRow.id as Student["id"],
    firstName: input.studentRow.firstName,
    lastName: input.studentRow.lastName,
    phoneNumber: input.studentRow.phoneNumber,
    academicYear: input.studentRow.academicYear,
    major: input.studentRow.major,
    institution: input.studentRow.institution,
    image: input.image,
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
    readonly getDownloadUrlForStudent: (input: {
      readonly studentId: string;
      readonly cvProfileId: string;
    }) => Effect.Effect<CvProfileDownloadUrl | null>;
    readonly deleteForStudent: (input: {
      readonly studentId: string;
      readonly cvProfileId: string;
    }) => Effect.Effect<boolean>;
    readonly resolvePresentedPreviewByPresentationCode: (
      presentationCode: string,
    ) => Effect.Effect<PresentedCvProfilePreview | null>;
  }
>()("@project/web/CvProfileRepository") {
  static readonly layer = Layer.effect(
    CvProfileRepository,
    Effect.gen(function*() {
      const db = yield* DB;
      const env = yield* ServerEnv;

      const makeS3 = () => makeS3StorageClient({
        accessKeyId: env.s3AccessKeyId,
        secretAccessKey: env.s3SecretAccessKey,
        bucket: env.s3Bucket,
        endpoint: env.s3Endpoint,
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

      const ensureHiddenDefaultProfileTypeRow = () =>
        Effect.gen(function*() {
          const existingRow = yield* getProfileTypeRow(hiddenDefaultCvProfileType.id);

          if (existingRow) {
            return existingRow;
          }

          yield* Effect.promise(() =>
            db
              .insert(cvProfileType)
              .values({
                id: hiddenDefaultCvProfileType.id,
                label: hiddenDefaultCvProfileType.label,
                sortOrder: 0,
              })
              .onConflictDoNothing(),
          );

          return yield* getProfileTypeRow(hiddenDefaultCvProfileType.id).pipe(
            Effect.flatMap((row) =>
              row == null ? Effect.die("Default CV profile type insert did not return a row") : Effect.succeed(row),
            ),
          );
        });

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

      const getPresentedPreviewByPresentationCode = (presentationCode: string) =>
        Effect.gen(function*() {
          const rows = yield* Effect.promise(() =>
            db
              .select({
                cvProfileRow: cvProfile,
                studentRow: student,
                image: user.image,
              })
              .from(cvProfile)
              .innerJoin(student, eq(student.id, cvProfile.studentId))
              .innerJoin(user, eq(user.id, student.ownerUserId))
              .orderBy(asc(cvProfile.createdAt), asc(cvProfile.id)),
          );

          return (
            rows.find(
              (row) =>
                encodeCvProfilePresentationCode(row.cvProfileRow.id) === presentationCode,
            ) ?? null
          );
        });

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
            const profileTypeRow = yield* (
              profileTypeId === hiddenDefaultCvProfileType.id
                ? ensureHiddenDefaultProfileTypeRow()
                : getProfileTypeRow(profileTypeId)
            );

            if (!profileTypeRow) {
              return null;
            }

            const cvProfileId = makeCvProfileId();
            const storageKey = makeStorageKey({
              studentId,
              cvProfileId,
              fileName,
            });
            const s3 = makeS3();
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

            const s3 = makeS3();
            const file = s3.file(cvProfileRow.storageKey);
            const contents = yield* Effect.promise(() => file.arrayBuffer());

            return new CvProfileFile({
              cvProfileId: cvProfileRow.id as CvProfileFile["cvProfileId"],
              fileName: cvProfileRow.fileName,
              contentType: cvProfileRow.contentType,
              contentsBase64: Buffer.from(contents).toString("base64"),
            });
          }),
        getDownloadUrlForStudent: ({ studentId, cvProfileId }) =>
          Effect.gen(function*() {
            const cvProfileRow = yield* getCvProfileRow({
              studentId,
              cvProfileId,
            });

            if (!cvProfileRow) {
              return null;
            }

            const s3 = makeS3();
            const url = yield* Effect.promise(() =>
              s3.file(cvProfileRow.storageKey).signedUrl({
                contentDisposition: `inline; filename="${cvProfileRow.fileName.replaceAll("\"", "")}"`,
                contentType: cvProfileRow.contentType,
                expiresInSeconds: 300,
              }),
            );

            return new CvProfileDownloadUrl({
              cvProfileId: cvProfileRow.id as CvProfileDownloadUrl["cvProfileId"],
              fileName: cvProfileRow.fileName,
              url,
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

            const s3 = makeS3();
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
        resolvePresentedPreviewByPresentationCode: (presentationCode) =>
          Effect.gen(function*() {
            const row = yield* getPresentedPreviewByPresentationCode(presentationCode);

            if (!row) {
              return null;
            }

            return new PresentedCvProfilePreview({
              student: toStudent({
                studentRow: row.studentRow,
                image: row.image,
              }),
              cvProfile: toCvProfile(row.cvProfileRow),
              qrIdentity: encodeCvProfilePresentationCode(row.cvProfileRow.id),
            });
          }),
      });
    }),
  );
}
