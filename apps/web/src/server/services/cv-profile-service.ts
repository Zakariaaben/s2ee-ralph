import {
  type AuthenticatedActor,
  type CvProfile,
  type CvProfileDownloadUrl,
  type CvProfileFile,
  type PresentedCvProfilePreview,
  type Student,
} from "@project/domain";
import { Effect, Layer, ServiceMap } from "effect";
import * as HttpApiError from "effect/unstable/httpapi/HttpApiError";

import { CvProfileRepository } from "../repositories/cv-profile-repository";
import { StudentRepository } from "../repositories/student-repository";

const requireStudentActor = (actor: AuthenticatedActor) =>
  Effect.gen(function*() {
    if (actor.role !== "student") {
      yield* new HttpApiError.Forbidden({});
    }

    return actor;
  });

const requireCompanyActor = (actor: AuthenticatedActor) =>
  Effect.gen(function*() {
    if (actor.role !== "company") {
      yield* new HttpApiError.Forbidden({});
    }

    return actor;
  });

const decodeBase64Contents = (contentsBase64: string) =>
  Uint8Array.from(Buffer.from(contentsBase64, "base64"));

export class CvProfileService extends ServiceMap.Service<
  CvProfileService,
  {
    readonly listCurrentStudentCvProfiles: (
      actor: AuthenticatedActor,
    ) => Effect.Effect<ReadonlyArray<CvProfile>, HttpApiError.Forbidden>;
    readonly listStudentCvProfiles: (input: {
      readonly actor: AuthenticatedActor;
      readonly studentId: Student["id"];
    }) => Effect.Effect<
      ReadonlyArray<CvProfile>,
      HttpApiError.Forbidden | HttpApiError.NotFound
    >;
    readonly createStudentCvProfile: (input: {
      readonly actor: AuthenticatedActor;
      readonly profileTypeId: string;
      readonly fileName: string;
      readonly contentType: string;
      readonly contentsBase64: string;
    }) => Effect.Effect<
      CvProfile,
      HttpApiError.Forbidden | HttpApiError.BadRequest | HttpApiError.NotFound
    >;
    readonly downloadStudentCvProfileFile: (input: {
      readonly actor: AuthenticatedActor;
      readonly cvProfileId: CvProfile["id"];
    }) => Effect.Effect<
      CvProfileFile,
      HttpApiError.Forbidden | HttpApiError.NotFound
    >;
    readonly getStudentCvProfileDownloadUrl: (input: {
      readonly actor: AuthenticatedActor;
      readonly cvProfileId: CvProfile["id"];
    }) => Effect.Effect<
      CvProfileDownloadUrl,
      HttpApiError.Forbidden | HttpApiError.NotFound
    >;
    readonly deleteStudentCvProfile: (input: {
      readonly actor: AuthenticatedActor;
      readonly cvProfileId: CvProfile["id"];
    }) => Effect.Effect<
      CvProfile["id"],
      HttpApiError.Forbidden | HttpApiError.NotFound
    >;
    readonly resolvePresentedCvProfile: (input: {
      readonly actor: AuthenticatedActor;
      readonly presentationCode: string;
    }) => Effect.Effect<
      PresentedCvProfilePreview,
      HttpApiError.Forbidden | HttpApiError.NotFound
    >;
  }
>()("@project/web/CvProfileService") {
  static readonly layer = Layer.effect(
    CvProfileService,
    Effect.gen(function*() {
      const cvProfileRepository = yield* CvProfileRepository;
      const studentRepository = yield* StudentRepository;

      return CvProfileService.of({
        listCurrentStudentCvProfiles: (actor) =>
          Effect.gen(function*() {
            const studentActor = yield* requireStudentActor(actor);
            const student = yield* studentRepository.getByOwnerUserId(studentActor.id);

            if (!student) {
              return [];
            }

            return yield* cvProfileRepository.listByStudentId(student.id);
          }),
        listStudentCvProfiles: ({ actor, studentId }) =>
          Effect.gen(function*() {
            yield* requireCompanyActor(actor);
            const student = yield* studentRepository.getById(studentId);

            if (!student) {
              return yield* Effect.fail(new HttpApiError.NotFound({}));
            }

            return yield* cvProfileRepository.listByStudentId(student.id);
          }),
        createStudentCvProfile: ({
          actor,
          profileTypeId,
          fileName,
          contentType,
          contentsBase64,
        }) =>
          Effect.gen(function*() {
            const studentActor = yield* requireStudentActor(actor);
            const student = yield* studentRepository.getByOwnerUserId(studentActor.id);

            if (!student) {
              return yield* Effect.fail(new HttpApiError.NotFound({}));
            }

            const createdCvProfile = yield* cvProfileRepository.createForStudent({
              studentId: student.id,
              profileTypeId,
              fileName,
              contentType,
              contents: decodeBase64Contents(contentsBase64),
            });

            if (!createdCvProfile) {
              return yield* Effect.fail(new HttpApiError.BadRequest({}));
            }

            return createdCvProfile;
          }),
        downloadStudentCvProfileFile: ({ actor, cvProfileId }) =>
          Effect.gen(function*() {
            const studentActor = yield* requireStudentActor(actor);
            const student = yield* studentRepository.getByOwnerUserId(studentActor.id);

            if (!student) {
              return yield* Effect.fail(new HttpApiError.NotFound({}));
            }

            const cvProfileFile = yield* cvProfileRepository.downloadForStudent({
              studentId: student.id,
              cvProfileId,
            });

            if (!cvProfileFile) {
              return yield* Effect.fail(new HttpApiError.NotFound({}));
            }

            return cvProfileFile;
          }),
        getStudentCvProfileDownloadUrl: ({ actor, cvProfileId }) =>
          Effect.gen(function*() {
            const studentActor = yield* requireStudentActor(actor);
            const student = yield* studentRepository.getByOwnerUserId(studentActor.id);

            if (!student) {
              return yield* Effect.fail(new HttpApiError.NotFound({}));
            }

            const downloadUrl = yield* cvProfileRepository.getDownloadUrlForStudent({
              studentId: student.id,
              cvProfileId,
            });

            if (!downloadUrl) {
              return yield* Effect.fail(new HttpApiError.NotFound({}));
            }

            return downloadUrl;
          }),
        deleteStudentCvProfile: ({ actor, cvProfileId }) =>
          Effect.gen(function*() {
            const studentActor = yield* requireStudentActor(actor);
            const student = yield* studentRepository.getByOwnerUserId(studentActor.id);

            if (!student) {
              return yield* Effect.fail(new HttpApiError.NotFound({}));
            }

            const deleted = yield* cvProfileRepository.deleteForStudent({
              studentId: student.id,
              cvProfileId,
            });

            if (!deleted) {
              return yield* Effect.fail(new HttpApiError.NotFound({}));
            }

            return cvProfileId;
          }),
        resolvePresentedCvProfile: ({ actor, presentationCode }) =>
          Effect.gen(function*() {
            yield* requireCompanyActor(actor);

            const preview =
              yield* cvProfileRepository.resolvePresentedPreviewByPresentationCode(
                presentationCode,
              );

            if (!preview) {
              return yield* Effect.fail(new HttpApiError.NotFound({}));
            }

            return preview;
          }),
      });
    }),
  ).pipe(
    Layer.provide(CvProfileRepository.layer),
    Layer.provideMerge(StudentRepository.layer),
  );
}
