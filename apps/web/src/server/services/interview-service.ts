import { type AuthenticatedActor, type Interview } from "@project/domain";
import { Effect, Layer, ServiceMap } from "effect";
import * as HttpApiError from "effect/unstable/httpapi/HttpApiError";

import { CompanyRepository } from "../repositories/company-repository";
import { CvProfileRepository } from "../repositories/cv-profile-repository";
import { InterviewRepository } from "../repositories/interview-repository";
import { StudentRepository } from "../repositories/student-repository";

const studentQrIdentityPrefix = "student:v1:";

const requireCompanyActor = (actor: AuthenticatedActor) =>
  Effect.gen(function*() {
    if (actor.role !== "company") {
      yield* new HttpApiError.Forbidden({});
    }

    return actor;
  });

const normalizeValue = (value: string) =>
  Effect.gen(function*() {
    const normalized = value.trim();

    if (normalized.length === 0) {
      yield* new HttpApiError.BadRequest({});
    }

    return normalized;
  });

const decodeStudentQrIdentity = (qrIdentity: string) =>
  Effect.gen(function*() {
    if (!qrIdentity.startsWith(studentQrIdentityPrefix)) {
      yield* new HttpApiError.BadRequest({});
    }

    const studentId = qrIdentity.slice(studentQrIdentityPrefix.length).trim();

    if (studentId.length === 0) {
      yield* new HttpApiError.BadRequest({});
    }

    return studentId;
  });

const normalizeScore = (score: number) =>
  Effect.gen(function*() {
    if (!Number.isFinite(score) || score < 1 || score > 5) {
      yield* new HttpApiError.BadRequest({});
    }

    return score;
  });

const uniqueValues = <Value>(values: ReadonlyArray<Value>) => {
  const seen = new Set<Value>();
  const unique: Array<Value> = [];

  for (const value of values) {
    if (seen.has(value)) {
      continue;
    }

    seen.add(value);
    unique.push(value);
  }

  return unique;
};

export class InterviewService extends ServiceMap.Service<
  InterviewService,
  {
    readonly listCurrentCompanyInterviews: (
      actor: AuthenticatedActor,
    ) => Effect.Effect<ReadonlyArray<Interview>, HttpApiError.Forbidden>;
    readonly completeInterview: (input: {
      readonly actor: AuthenticatedActor;
      readonly recruiterId: string;
      readonly qrIdentity: string;
      readonly cvProfileId: string;
      readonly score: number;
      readonly globalTagIds: ReadonlyArray<string>;
      readonly companyTagLabels: ReadonlyArray<string>;
    }) => Effect.Effect<
      Interview,
      HttpApiError.Forbidden | HttpApiError.BadRequest | HttpApiError.NotFound
    >;
    readonly cancelInterview: (input: {
      readonly actor: AuthenticatedActor;
      readonly recruiterId: string;
      readonly qrIdentity: string;
      readonly cvProfileId: string;
    }) => Effect.Effect<
      Interview,
      HttpApiError.Forbidden | HttpApiError.BadRequest | HttpApiError.NotFound
    >;
  }
>()("@project/web/InterviewService") {
  static readonly layer = Layer.effect(
    InterviewService,
    Effect.gen(function*() {
      const companyRepository = yield* CompanyRepository;
      const cvProfileRepository = yield* CvProfileRepository;
      const interviewRepository = yield* InterviewRepository;
      const studentRepository = yield* StudentRepository;

      const resolveInterviewContext = (input: {
        readonly actor: AuthenticatedActor;
        readonly recruiterId: string;
        readonly qrIdentity: string;
        readonly cvProfileId: string;
      }) =>
        Effect.gen(function*() {
          const companyActor = yield* requireCompanyActor(input.actor);
          const company = yield* companyRepository.getByOwnerUserId(companyActor.id);

          if (!company) {
            return yield* Effect.fail(new HttpApiError.NotFound({}));
          }

          const recruiter = company.recruiters.find(
            (currentRecruiter) => currentRecruiter.id === input.recruiterId,
          );

          if (!recruiter) {
            return yield* Effect.fail(new HttpApiError.NotFound({}));
          }

          const studentId = yield* decodeStudentQrIdentity(input.qrIdentity);
          const student = yield* studentRepository.getById(studentId);

          if (!student) {
            return yield* Effect.fail(new HttpApiError.NotFound({}));
          }

          const cvProfiles = yield* cvProfileRepository.listByStudentId(student.id);
          const selectedCvProfile = cvProfiles.find(
            (cvProfile) => cvProfile.id === input.cvProfileId,
          );

          if (!selectedCvProfile) {
            return yield* Effect.fail(new HttpApiError.NotFound({}));
          }

          return {
            company,
            recruiter,
            student,
            selectedCvProfile,
          };
        });

      return InterviewService.of({
        listCurrentCompanyInterviews: (actor) =>
          Effect.gen(function*() {
            const companyActor = yield* requireCompanyActor(actor);
            const company = yield* companyRepository.getByOwnerUserId(companyActor.id);

            if (!company) {
              return [];
            }

            return yield* interviewRepository.listByCompanyId(company.id);
          }),
        completeInterview: ({
          actor,
          recruiterId,
          qrIdentity,
          cvProfileId,
          score,
          globalTagIds,
          companyTagLabels,
        }) =>
          Effect.gen(function*() {
            const { company, recruiter, student, selectedCvProfile } =
              yield* resolveInterviewContext({
                actor,
                recruiterId,
                qrIdentity,
                cvProfileId,
              });

            const completedInterview = yield* interviewRepository.createCompleted({
              companyId: company.id,
              studentId: student.id,
              cvProfileId: selectedCvProfile.id,
              recruiterName: recruiter.name,
              score: yield* normalizeScore(score),
              globalTagIds: uniqueValues(globalTagIds),
              companyTagLabels: uniqueValues(
                yield* Effect.forEach(companyTagLabels, normalizeValue),
              ),
            });

            if (!completedInterview) {
              return yield* Effect.fail(new HttpApiError.BadRequest({}));
            }

            return completedInterview;
          }),
        cancelInterview: ({ actor, recruiterId, qrIdentity, cvProfileId }) =>
          Effect.gen(function*() {
            const { company, recruiter, student, selectedCvProfile } =
              yield* resolveInterviewContext({
                actor,
                recruiterId,
                qrIdentity,
                cvProfileId,
              });

            return yield* interviewRepository.createCancelled({
              companyId: company.id,
              studentId: student.id,
              cvProfileId: selectedCvProfile.id,
              recruiterName: recruiter.name,
            });
          }),
      });
    }),
  ).pipe(
    Layer.provide(CompanyRepository.layer),
    Layer.provideMerge(CvProfileRepository.layer),
    Layer.provideMerge(InterviewRepository.layer),
    Layer.provideMerge(StudentRepository.layer),
  );
}
