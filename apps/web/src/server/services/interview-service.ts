import {
  CompanyCompletedInterviewExportFile,
  type AuthenticatedActor,
  type CompanyCompletedInterviewLedgerEntry,
  type Interview,
} from "@project/domain";
import { Effect, Layer, ServiceMap } from "effect";
import * as HttpApiError from "effect/unstable/httpapi/HttpApiError";

import { CompanyRepository } from "../repositories/company-repository";
import { CvProfileRepository } from "../repositories/cv-profile-repository";
import { InterviewRepository } from "../repositories/interview-repository";
import { StudentRepository } from "../repositories/student-repository";

const requireCompanyActor = (actor: AuthenticatedActor) =>
  Effect.gen(function*() {
    if (actor.role !== "company") {
      yield* new HttpApiError.Forbidden({});
    }

    return actor;
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

const toFileNameSegment = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "company";

export class InterviewService extends ServiceMap.Service<
  InterviewService,
  {
    readonly listCurrentCompanyInterviews: (
      actor: AuthenticatedActor,
    ) => Effect.Effect<ReadonlyArray<Interview>, HttpApiError.Forbidden>;
    readonly listCurrentCompanyCompletedInterviews: (
      actor: AuthenticatedActor,
    ) => Effect.Effect<
      ReadonlyArray<CompanyCompletedInterviewLedgerEntry>,
      HttpApiError.Forbidden
    >;
    readonly exportCurrentCompanyCompletedInterviews: (input: {
      readonly actor: AuthenticatedActor;
      readonly includeCvFiles: boolean;
    }) => Effect.Effect<
      CompanyCompletedInterviewExportFile,
      HttpApiError.Forbidden | HttpApiError.NotFound
    >;
    readonly completeInterview: (input: {
      readonly actor: AuthenticatedActor;
      readonly recruiterId: string;
      readonly studentId: string;
      readonly cvProfileId: string;
      readonly score: number;
      readonly globalTagIds: ReadonlyArray<string>;
      readonly companyTagLabels: ReadonlyArray<string>;
      readonly notes: string;
    }) => Effect.Effect<
      Interview,
      HttpApiError.Forbidden | HttpApiError.BadRequest | HttpApiError.NotFound
    >;
    readonly cancelInterview: (input: {
      readonly actor: AuthenticatedActor;
      readonly recruiterId: string;
      readonly studentId: string;
      readonly cvProfileId: string;
      readonly notes: string;
    }) => Effect.Effect<
      Interview,
      HttpApiError.Forbidden | HttpApiError.NotFound
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
        readonly studentId: string;
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

          const student = yield* studentRepository.getById(input.studentId);

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
        listCurrentCompanyCompletedInterviews: (actor) =>
          Effect.gen(function*() {
            const companyActor = yield* requireCompanyActor(actor);
            const company = yield* companyRepository.getByOwnerUserId(companyActor.id);

            if (!company) {
              return [];
            }

            return yield* interviewRepository.listCompletedLedgerByCompanyId(company.id);
          }),
        exportCurrentCompanyCompletedInterviews: ({ actor, includeCvFiles }) =>
          Effect.gen(function*() {
            const companyActor = yield* requireCompanyActor(actor);
            const company = yield* companyRepository.getByOwnerUserId(companyActor.id);

            if (!company) {
              return yield* Effect.fail(new HttpApiError.NotFound({}));
            }

            const completedInterviews =
              yield* interviewRepository.listCompletedLedgerByCompanyId(company.id);

            const interviews = yield* Effect.forEach(completedInterviews, (entry) =>
              Effect.gen(function*() {
                const cvFile = includeCvFiles
                  ? yield* cvProfileRepository.downloadForStudent({
                      studentId: entry.student.id,
                      cvProfileId: entry.cvProfile.id,
                    })
                  : null;

                if (includeCvFiles && !cvFile) {
                  return yield* Effect.fail(new HttpApiError.NotFound({}));
                }

                return {
                  interview: {
                    id: entry.interview.id,
                    status: entry.interview.status,
                    score: entry.interview.score,
                    notes: entry.interview.notes,
                  },
                  student: {
                    firstName: entry.student.firstName,
                    lastName: entry.student.lastName,
                  },
                  cvProfile: {
                    id: entry.cvProfile.id,
                    fileName: entry.cvProfile.fileName,
                  },
                  ...(cvFile
                    ? {
                        cvFile: {
                          fileName: cvFile.fileName,
                          contentsBase64: cvFile.contentsBase64,
                        },
                      }
                    : {}),
                };
              }),
            );
            const contents = JSON.stringify(
              {
                companyId: company.id,
                companyName: company.name,
                interviews,
              },
              null,
              2,
            );

            return new CompanyCompletedInterviewExportFile({
              fileName: `${toFileNameSegment(company.name)}-completed-interviews.json`,
              contentType: "application/json",
              contentsBase64: Buffer.from(contents, "utf8").toString("base64"),
            });
          }),
        completeInterview: ({
          actor,
          recruiterId,
          studentId,
          cvProfileId,
          score,
          globalTagIds,
          companyTagLabels,
          notes,
        }) =>
          Effect.gen(function*() {
            const { company, recruiter, student, selectedCvProfile } =
              yield* resolveInterviewContext({
                actor,
                recruiterId,
                studentId,
                cvProfileId,
              });

            const completedInterview = yield* interviewRepository.createCompleted({
              companyId: company.id,
              studentId: student.id,
              cvProfileId: selectedCvProfile.id,
              recruiterName: recruiter.name,
              score,
              globalTagIds: uniqueValues(globalTagIds),
              companyTagLabels: uniqueValues(companyTagLabels),
              notes,
            });

            if (!completedInterview) {
              return yield* Effect.fail(new HttpApiError.BadRequest({}));
            }

            return completedInterview;
          }),
        cancelInterview: ({ actor, recruiterId, studentId, cvProfileId, notes }) =>
          Effect.gen(function*() {
            const { company, recruiter, student, selectedCvProfile } =
              yield* resolveInterviewContext({
                actor,
                recruiterId,
                studentId,
                cvProfileId,
              });

            return yield* interviewRepository.createCancelled({
              companyId: company.id,
              studentId: student.id,
              cvProfileId: selectedCvProfile.id,
              recruiterName: recruiter.name,
              notes,
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
