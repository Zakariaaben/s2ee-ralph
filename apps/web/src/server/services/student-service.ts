import { type AuthenticatedActor, type Student } from "@project/domain";
import { Effect, Layer, ServiceMap } from "effect";
import * as HttpApiError from "effect/unstable/httpapi/HttpApiError";

import { StudentRepository } from "../repositories/student-repository";

const studentQrIdentityPrefix = "student:v1:";

const requireStudentActor = (actor: AuthenticatedActor) => {
  if (actor.role !== "student") {
    return Effect.fail(new HttpApiError.Forbidden({}));
  }

  return Effect.succeed(actor);
};

const requireCompanyActor = (actor: AuthenticatedActor) => {
  if (actor.role !== "company") {
    return Effect.fail(new HttpApiError.Forbidden({}));
  }

  return Effect.succeed(actor);
};

const normalizeValue = (value: string) => {
  const normalized = value.trim();

  if (normalized.length === 0) {
    return Effect.fail(new HttpApiError.BadRequest({}));
  }

  return Effect.succeed(normalized);
};

const encodeStudentQrIdentity = (studentId: string) =>
  `${studentQrIdentityPrefix}${studentId}`;

const decodeStudentQrIdentity = (qrIdentity: string) => {
  if (!qrIdentity.startsWith(studentQrIdentityPrefix)) {
    return Effect.fail(new HttpApiError.BadRequest({}));
  }

  const studentId = qrIdentity.slice(studentQrIdentityPrefix.length).trim();

  if (studentId.length === 0) {
    return Effect.fail(new HttpApiError.BadRequest({}));
  }

  return Effect.succeed(studentId);
};

export class StudentService extends ServiceMap.Service<
  StudentService,
  {
    readonly getCurrentStudent: (
      actor: AuthenticatedActor,
    ) => Effect.Effect<Student | null, HttpApiError.Forbidden>;
    readonly upsertStudentOnboarding: (
      input: {
        readonly actor: AuthenticatedActor;
        readonly firstName: string;
        readonly lastName: string;
        readonly course: string;
      },
    ) => Effect.Effect<
      Student,
      HttpApiError.Forbidden | HttpApiError.BadRequest
    >;
    readonly issueStudentQrIdentity: (
      actor: AuthenticatedActor,
    ) => Effect.Effect<
      string,
      HttpApiError.Forbidden | HttpApiError.NotFound
    >;
    readonly resolveStudentQrIdentity: (
      input: {
        readonly actor: AuthenticatedActor;
        readonly qrIdentity: string;
      },
    ) => Effect.Effect<
      Student,
      | HttpApiError.Forbidden
      | HttpApiError.BadRequest
      | HttpApiError.NotFound
    >;
  }
>()("@project/web/StudentService") {
  static readonly layer = Layer.effect(
    StudentService,
    Effect.gen(function*() {
      const studentRepository = yield* StudentRepository;

      return StudentService.of({
        getCurrentStudent: (actor) =>
          Effect.gen(function*() {
            const studentActor = yield* requireStudentActor(actor);

            return yield* studentRepository.getByOwnerUserId(studentActor.id);
          }),
        upsertStudentOnboarding: ({ actor, firstName, lastName, course }) =>
          Effect.gen(function*() {
            const studentActor = yield* requireStudentActor(actor);
            const normalizedFirstName = yield* normalizeValue(firstName);
            const normalizedLastName = yield* normalizeValue(lastName);
            const normalizedCourse = yield* normalizeValue(course);

            return yield* studentRepository.upsertByOwnerUserId({
              ownerUserId: studentActor.id,
              firstName: normalizedFirstName,
              lastName: normalizedLastName,
              course: normalizedCourse,
            });
          }),
        issueStudentQrIdentity: (actor) =>
          Effect.gen(function*() {
            const studentActor = yield* requireStudentActor(actor);
            const currentStudent = yield* studentRepository.getByOwnerUserId(studentActor.id);

            if (!currentStudent) {
              return yield* Effect.fail(new HttpApiError.NotFound({}));
            }

            return encodeStudentQrIdentity(currentStudent.id);
          }),
        resolveStudentQrIdentity: ({ actor, qrIdentity }) =>
          Effect.gen(function*() {
            yield* requireCompanyActor(actor);

            const studentId = yield* decodeStudentQrIdentity(qrIdentity);
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
