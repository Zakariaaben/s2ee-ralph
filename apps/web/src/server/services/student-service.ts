import { type AuthenticatedActor, type Student } from "@project/domain";
import { Effect, Layer, ServiceMap } from "effect";
import * as HttpApiError from "effect/unstable/httpapi/HttpApiError";

import { StudentRepository } from "../repositories/student-repository";

const studentQrIdentityPrefix = "student:v1:";

const requireStudentActor = (actor: AuthenticatedActor) =>
  Effect.gen(function* () {
    if (actor.role !== "student") {
      yield* new HttpApiError.Forbidden({});
    }

    return actor;
  });

const requireCompanyActor = (actor: AuthenticatedActor) =>
  Effect.gen(function* () {
    if (actor.role !== "company") {
      yield* new HttpApiError.Forbidden({});
    }

    return actor;
  });

const encodeStudentQrIdentity = (studentId: string) =>
  `${studentQrIdentityPrefix}${studentId}`;

export class StudentService extends ServiceMap.Service<
  StudentService,
  {
    readonly getCurrentStudent: (
      actor: AuthenticatedActor,
    ) => Effect.Effect<Student | null, HttpApiError.Forbidden>;
    readonly upsertStudentOnboarding: (input: {
      readonly actor: AuthenticatedActor;
      readonly firstName: string;
      readonly lastName: string;
      readonly phoneNumber: string;
      readonly academicYear: string;
      readonly major: string;
      readonly institution: string;
      readonly image: string | null;
    }) => Effect.Effect<Student, HttpApiError.Forbidden>;
    readonly issueStudentQrIdentity: (
      actor: AuthenticatedActor,
    ) => Effect.Effect<string, HttpApiError.Forbidden | HttpApiError.NotFound>;
    readonly resolveStudentQrIdentity: (input: {
      readonly actor: AuthenticatedActor;
      readonly studentId: string;
    }) => Effect.Effect<Student, HttpApiError.Forbidden | HttpApiError.NotFound>;
  }
>()("@project/web/StudentService") {
  static readonly layer = Layer.effect(
    StudentService,
    Effect.gen(function* () {
      const studentRepository = yield* StudentRepository;

      return StudentService.of({
        getCurrentStudent: (actor) =>
          Effect.gen(function* () {
            const studentActor = yield* requireStudentActor(actor);

            return yield* studentRepository.getByOwnerUserId(studentActor.id);
          }),
        upsertStudentOnboarding: ({
          actor,
          firstName,
          lastName,
          phoneNumber,
          academicYear,
          major,
          institution,
          image,
        }) =>
          Effect.gen(function* () {
            const studentActor = yield* requireStudentActor(actor);

            return yield* studentRepository.upsertByOwnerUserId({
              ownerUserId: studentActor.id,
              firstName,
              lastName,
              phoneNumber,
              academicYear,
              major,
              institution,
              image,
            });
          }),
        issueStudentQrIdentity: (actor) =>
          Effect.gen(function* () {
            const studentActor = yield* requireStudentActor(actor);
            const currentStudent = yield* studentRepository.getByOwnerUserId(
              studentActor.id,
            );

            if (!currentStudent) {
              return yield* Effect.fail(new HttpApiError.NotFound({}));
            }

            return encodeStudentQrIdentity(currentStudent.id);
          }),
        resolveStudentQrIdentity: ({ actor, studentId }) =>
          Effect.gen(function* () {
            yield* requireCompanyActor(actor);
            const resolvedStudent = yield* studentRepository.getById(studentId);

            if (!resolvedStudent) {
              return yield* Effect.fail(new HttpApiError.NotFound({}));
            }

            return resolvedStudent;
          }),
      });
    }),
  ).pipe(Layer.provide(StudentRepository.layer));
}
