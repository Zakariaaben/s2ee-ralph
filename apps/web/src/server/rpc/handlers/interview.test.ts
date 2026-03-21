import { account, session, user } from "@project/db/schema/auth";
import { company, recruiter } from "@project/db/schema/company";
import { cvProfile } from "@project/db/schema/cv-profile";
import {
  companyInterviewTag,
  interview,
  interviewCompanyTag,
  interviewGlobalTag,
} from "@project/db/schema/interview";
import { student as studentTable } from "@project/db/schema/student";
import { cvProfileType, globalInterviewTag } from "@project/db/schema/vocabulary";
import { type GlobalInterviewTag as GlobalInterviewTagModel } from "@project/domain";
import {
  CompanyRpcGroup,
  CvProfileRpcGroup,
  InterviewRpcGroup,
  StudentRpcGroup,
  VocabularyRpcGroup,
} from "@project/rpc";
import { afterEach, beforeAll, describe, expect, it } from "@effect/vitest";
import { Effect } from "effect";
import * as RpcClient from "effect/unstable/rpc/RpcClient";
import { RpcTest } from "effect/unstable/rpc";

import {
  AppRpcMiddlewareLive,
  CompanyRpcLive,
  CvProfileRpcLive,
  InterviewRpcLive,
  StudentRpcLive,
  VocabularyRpcLive,
} from "../live";
import {
  makeRpcTestLive,
  provisionSessionHeaders,
  resetTables,
  startPostgresAndStorageTestInfra,
} from "../test-support";

const InterviewTestLive = makeRpcTestLive(
  CompanyRpcLive,
  CvProfileRpcLive,
  InterviewRpcLive,
  StudentRpcLive,
  VocabularyRpcLive,
  AppRpcMiddlewareLive,
);

const makeCompanyClient = RpcTest.makeClient(CompanyRpcGroup).pipe(
  Effect.provide(InterviewTestLive),
);

const makeCvProfileClient = RpcTest.makeClient(CvProfileRpcGroup).pipe(
  Effect.provide(InterviewTestLive),
);

const makeInterviewClient = RpcTest.makeClient(InterviewRpcGroup).pipe(
  Effect.provide(InterviewTestLive),
);

const makeStudentClient = RpcTest.makeClient(StudentRpcGroup).pipe(
  Effect.provide(InterviewTestLive),
);

const makeVocabularyClient = RpcTest.makeClient(VocabularyRpcGroup).pipe(
  Effect.provide(InterviewTestLive),
);

const asGlobalInterviewTagId = (value: string) =>
  value as GlobalInterviewTagModel["id"];

beforeAll(() => {
  startPostgresAndStorageTestInfra();
});

afterEach(async () => {
  await Effect.runPromise(
    resetTables([
      interviewCompanyTag,
      interviewGlobalTag,
      interview,
      companyInterviewTag,
      cvProfile,
      cvProfileType,
      globalInterviewTag,
      recruiter,
      company,
      studentTable,
      session,
      account,
      user,
    ]),
  );
});

describe("interview rpc", () => {
  it.effect(
    "company actors can list only their completed interview ledger entries with joined student and CV context",
    () =>
      Effect.gen(function*() {
        const adminHeaders = yield* provisionSessionHeaders("admin");
        const companyHeaders = yield* provisionSessionHeaders("company");
        const otherCompanyHeaders = yield* provisionSessionHeaders("company");
        const studentHeaders = yield* provisionSessionHeaders("student");
        const companyClient = yield* makeCompanyClient;
        const cvProfileClient = yield* makeCvProfileClient;
        const interviewClient = yield* makeInterviewClient;
        const studentClient = yield* makeStudentClient;
        const vocabularyClient = yield* makeVocabularyClient;

        yield* vocabularyClient.seedControlledVocabularies({
          cvProfileTypes: [{ id: "software-engineering", label: "Software Engineering" }],
          globalInterviewTags: [{ id: "curious", label: "Curious" }],
        }).pipe(RpcClient.withHeaders(adminHeaders));

        yield* companyClient.upsertCompanyProfile({ name: "Acme Systems" }).pipe(
          RpcClient.withHeaders(companyHeaders),
        );
        const companyWithRecruiter = yield* companyClient.addRecruiter({
          name: "Nora Recruiter",
        }).pipe(RpcClient.withHeaders(companyHeaders));

        yield* companyClient.upsertCompanyProfile({ name: "Globex" }).pipe(
          RpcClient.withHeaders(otherCompanyHeaders),
        );
        const otherCompanyWithRecruiter = yield* companyClient.addRecruiter({
          name: "Iris Recruiter",
        }).pipe(RpcClient.withHeaders(otherCompanyHeaders));

        const student = yield* studentClient.upsertStudentOnboarding({
          firstName: "Ada",
          lastName: "Lovelace",
          course: "Computer Science",
        }).pipe(RpcClient.withHeaders(studentHeaders));

        const selectedCvProfile = yield* cvProfileClient.createStudentCvProfile({
          profileTypeId: "software-engineering",
          fileName: "ada-backend.pdf",
          contentType: "application/pdf",
          contentsBase64: Buffer.from("ada-backend-cv", "utf8").toString("base64"),
        }).pipe(RpcClient.withHeaders(studentHeaders));

        const qrIdentity = yield* studentClient.issueStudentQrIdentity().pipe(
          RpcClient.withHeaders(studentHeaders),
        );

        const completedInterview = yield* interviewClient.completeInterview({
          recruiterId: companyWithRecruiter.recruiters[0]!.id,
          qrIdentity,
          cvProfileId: selectedCvProfile.id,
          score: 4.3,
          globalTagIds: [asGlobalInterviewTagId("curious")],
          companyTagLabels: ["Backend Ready"],
        }).pipe(RpcClient.withHeaders(companyHeaders));

        yield* interviewClient.cancelInterview({
          recruiterId: companyWithRecruiter.recruiters[0]!.id,
          qrIdentity,
          cvProfileId: selectedCvProfile.id,
        }).pipe(RpcClient.withHeaders(companyHeaders));

        yield* interviewClient.completeInterview({
          recruiterId: otherCompanyWithRecruiter.recruiters[0]!.id,
          qrIdentity,
          cvProfileId: selectedCvProfile.id,
          score: 3.7,
          globalTagIds: [],
          companyTagLabels: [],
        }).pipe(RpcClient.withHeaders(otherCompanyHeaders));

        expect(
          yield* interviewClient.listCurrentCompanyCompletedInterviews().pipe(
            RpcClient.withHeaders(companyHeaders),
          ),
        ).toEqual([
          {
            interview: completedInterview,
            student,
            cvProfile: selectedCvProfile,
          },
        ]);
      }),
  );

  it.effect(
    "company actors can complete an interview for a scanned student CV profile with recruiter snapshots and scoped tags",
    () =>
      Effect.gen(function*() {
        const adminHeaders = yield* provisionSessionHeaders("admin");
        const companyHeaders = yield* provisionSessionHeaders("company");
        const studentHeaders = yield* provisionSessionHeaders("student");
        const companyClient = yield* makeCompanyClient;
        const cvProfileClient = yield* makeCvProfileClient;
        const interviewClient = yield* makeInterviewClient;
        const studentClient = yield* makeStudentClient;
        const vocabularyClient = yield* makeVocabularyClient;

        yield* vocabularyClient.seedControlledVocabularies({
          cvProfileTypes: [{ id: "software-engineering", label: "Software Engineering" }],
          globalInterviewTags: [{ id: "curious", label: "Curious" }],
        }).pipe(RpcClient.withHeaders(adminHeaders));

        yield* companyClient.upsertCompanyProfile({ name: "Acme Systems" }).pipe(
          RpcClient.withHeaders(companyHeaders),
        );
        const companyWithRecruiter = yield* companyClient.addRecruiter({
          name: "Nora Recruiter",
        }).pipe(RpcClient.withHeaders(companyHeaders));

        const student = yield* studentClient.upsertStudentOnboarding({
          firstName: "Ada",
          lastName: "Lovelace",
          course: "Computer Science",
        }).pipe(RpcClient.withHeaders(studentHeaders));

        const selectedCvProfile = yield* cvProfileClient.createStudentCvProfile({
          profileTypeId: "software-engineering",
          fileName: "ada-backend.pdf",
          contentType: "application/pdf",
          contentsBase64: Buffer.from("ada-backend-cv", "utf8").toString("base64"),
        }).pipe(RpcClient.withHeaders(studentHeaders));

        const qrIdentity = yield* studentClient.issueStudentQrIdentity().pipe(
          RpcClient.withHeaders(studentHeaders),
        );

        const completedInterview = yield* interviewClient.completeInterview({
          recruiterId: companyWithRecruiter.recruiters[0]!.id,
          qrIdentity,
          cvProfileId: selectedCvProfile.id,
          score: 4.3,
          globalTagIds: [asGlobalInterviewTagId("curious")],
          companyTagLabels: ["  Backend Ready  "],
        }).pipe(RpcClient.withHeaders(companyHeaders));

        expect(completedInterview).toMatchObject({
          companyId: companyWithRecruiter.id,
          studentId: student.id,
          cvProfileId: selectedCvProfile.id,
          recruiterName: "Nora Recruiter",
          status: "completed",
          score: 4.3,
          globalTags: [{ id: "curious", label: "Curious" }],
          companyTags: [{ label: "Backend Ready" }],
        });
        expect(completedInterview.companyTags).toHaveLength(1);
        expect(typeof completedInterview.companyTags[0]!.id).toBe("string");

        expect(
          yield* interviewClient.listCurrentCompanyInterviews().pipe(
            RpcClient.withHeaders(companyHeaders),
          ),
        ).toEqual([completedInterview]);
      }),
  );

  it.effect(
    "company actors can cancel an interview for a scanned student CV profile without creating score or tag data",
    () =>
      Effect.gen(function*() {
        const adminHeaders = yield* provisionSessionHeaders("admin");
        const companyHeaders = yield* provisionSessionHeaders("company");
        const studentHeaders = yield* provisionSessionHeaders("student");
        const companyClient = yield* makeCompanyClient;
        const cvProfileClient = yield* makeCvProfileClient;
        const interviewClient = yield* makeInterviewClient;
        const studentClient = yield* makeStudentClient;
        const vocabularyClient = yield* makeVocabularyClient;

        yield* vocabularyClient.seedControlledVocabularies({
          cvProfileTypes: [{ id: "software-engineering", label: "Software Engineering" }],
          globalInterviewTags: [{ id: "curious", label: "Curious" }],
        }).pipe(RpcClient.withHeaders(adminHeaders));

        yield* companyClient.upsertCompanyProfile({ name: "Acme Systems" }).pipe(
          RpcClient.withHeaders(companyHeaders),
        );
        const companyWithRecruiter = yield* companyClient.addRecruiter({
          name: "Nora Recruiter",
        }).pipe(RpcClient.withHeaders(companyHeaders));

        yield* studentClient.upsertStudentOnboarding({
          firstName: "Grace",
          lastName: "Hopper",
          course: "Computer Science",
        }).pipe(RpcClient.withHeaders(studentHeaders));

        const selectedCvProfile = yield* cvProfileClient.createStudentCvProfile({
          profileTypeId: "software-engineering",
          fileName: "grace-backend.pdf",
          contentType: "application/pdf",
          contentsBase64: Buffer.from("grace-backend-cv", "utf8").toString("base64"),
        }).pipe(RpcClient.withHeaders(studentHeaders));

        const qrIdentity = yield* studentClient.issueStudentQrIdentity().pipe(
          RpcClient.withHeaders(studentHeaders),
        );

        const cancelledInterview = yield* interviewClient.cancelInterview({
          recruiterId: companyWithRecruiter.recruiters[0]!.id,
          qrIdentity,
          cvProfileId: selectedCvProfile.id,
        }).pipe(RpcClient.withHeaders(companyHeaders));

        expect(cancelledInterview).toMatchObject({
          companyId: companyWithRecruiter.id,
          cvProfileId: selectedCvProfile.id,
          recruiterName: "Nora Recruiter",
          status: "cancelled",
          score: null,
          globalTags: [],
          companyTags: [],
        });
      }),
  );

  it.effect(
    "company actors can export only their completed interviews with optional CV file contents",
    () =>
      Effect.gen(function*() {
        const adminHeaders = yield* provisionSessionHeaders("admin");
        const companyHeaders = yield* provisionSessionHeaders("company");
        const otherCompanyHeaders = yield* provisionSessionHeaders("company");
        const studentHeaders = yield* provisionSessionHeaders("student");
        const companyClient = yield* makeCompanyClient;
        const cvProfileClient = yield* makeCvProfileClient;
        const interviewClient = yield* makeInterviewClient;
        const studentClient = yield* makeStudentClient;
        const vocabularyClient = yield* makeVocabularyClient;

        yield* vocabularyClient.seedControlledVocabularies({
          cvProfileTypes: [{ id: "software-engineering", label: "Software Engineering" }],
          globalInterviewTags: [{ id: "curious", label: "Curious" }],
        }).pipe(RpcClient.withHeaders(adminHeaders));

        yield* companyClient.upsertCompanyProfile({ name: "Acme Systems" }).pipe(
          RpcClient.withHeaders(companyHeaders),
        );
        const companyWithRecruiter = yield* companyClient.addRecruiter({
          name: "Nora Recruiter",
        }).pipe(RpcClient.withHeaders(companyHeaders));

        yield* companyClient.upsertCompanyProfile({ name: "Globex" }).pipe(
          RpcClient.withHeaders(otherCompanyHeaders),
        );
        const otherCompanyWithRecruiter = yield* companyClient.addRecruiter({
          name: "Iris Recruiter",
        }).pipe(RpcClient.withHeaders(otherCompanyHeaders));

        yield* studentClient.upsertStudentOnboarding({
          firstName: "Grace",
          lastName: "Hopper",
          course: "Computer Science",
        }).pipe(RpcClient.withHeaders(studentHeaders));

        const selectedCvProfile = yield* cvProfileClient.createStudentCvProfile({
          profileTypeId: "software-engineering",
          fileName: "grace-backend.pdf",
          contentType: "application/pdf",
          contentsBase64: Buffer.from("grace-backend-cv", "utf8").toString("base64"),
        }).pipe(RpcClient.withHeaders(studentHeaders));

        const qrIdentity = yield* studentClient.issueStudentQrIdentity().pipe(
          RpcClient.withHeaders(studentHeaders),
        );

        const completedInterview = yield* interviewClient.completeInterview({
          recruiterId: companyWithRecruiter.recruiters[0]!.id,
          qrIdentity,
          cvProfileId: selectedCvProfile.id,
          score: 4.7,
          globalTagIds: [asGlobalInterviewTagId("curious")],
          companyTagLabels: ["Backend Ready"],
        }).pipe(RpcClient.withHeaders(companyHeaders));

        yield* interviewClient.cancelInterview({
          recruiterId: companyWithRecruiter.recruiters[0]!.id,
          qrIdentity,
          cvProfileId: selectedCvProfile.id,
        }).pipe(RpcClient.withHeaders(companyHeaders));

        yield* interviewClient.completeInterview({
          recruiterId: otherCompanyWithRecruiter.recruiters[0]!.id,
          qrIdentity,
          cvProfileId: selectedCvProfile.id,
          score: 3.4,
          globalTagIds: [],
          companyTagLabels: [],
        }).pipe(RpcClient.withHeaders(otherCompanyHeaders));

        const withoutCvFiles = yield* interviewClient.exportCurrentCompanyCompletedInterviews({
          includeCvFiles: false,
        }).pipe(RpcClient.withHeaders(companyHeaders));
        const parsedWithoutCvFiles = JSON.parse(
          Buffer.from(withoutCvFiles.contentsBase64, "base64").toString("utf8"),
        ) as {
          companyId: string;
          companyName: string;
          interviews: Array<{
            interview: { id: string; status: string; score: number | null };
            student: { firstName: string; lastName: string };
            cvProfile: { id: string; fileName: string };
            cvFile?: unknown;
          }>;
        };

        expect(withoutCvFiles.contentType).toBe("application/json");
        expect(parsedWithoutCvFiles).toEqual({
          companyId: companyWithRecruiter.id,
          companyName: "Acme Systems",
          interviews: [
            {
              interview: {
                id: completedInterview.id,
                status: "completed",
                score: 4.7,
              },
              student: {
                firstName: "Grace",
                lastName: "Hopper",
              },
              cvProfile: {
                id: selectedCvProfile.id,
                fileName: "grace-backend.pdf",
              },
            },
          ],
        });

        const withCvFiles = yield* interviewClient.exportCurrentCompanyCompletedInterviews({
          includeCvFiles: true,
        }).pipe(RpcClient.withHeaders(companyHeaders));
        const parsedWithCvFiles = JSON.parse(
          Buffer.from(withCvFiles.contentsBase64, "base64").toString("utf8"),
        ) as {
          interviews: Array<{
            interview: { id: string };
            cvFile?: { fileName: string; contentsBase64: string };
          }>;
        };

        expect(parsedWithCvFiles.interviews).toEqual([
          {
            interview: { id: completedInterview.id },
            cvFile: {
              fileName: "grace-backend.pdf",
              contentsBase64: Buffer.from("grace-backend-cv", "utf8").toString("base64"),
            },
          },
        ]);
      }),
  );

  it.effect(
    "repeated interviews on the same student CV profile stay allowed and keep recruiter name snapshots stable across roster changes",
    () =>
      Effect.gen(function*() {
        const adminHeaders = yield* provisionSessionHeaders("admin");
        const companyHeaders = yield* provisionSessionHeaders("company");
        const studentHeaders = yield* provisionSessionHeaders("student");
        const companyClient = yield* makeCompanyClient;
        const cvProfileClient = yield* makeCvProfileClient;
        const interviewClient = yield* makeInterviewClient;
        const studentClient = yield* makeStudentClient;
        const vocabularyClient = yield* makeVocabularyClient;

        yield* vocabularyClient.seedControlledVocabularies({
          cvProfileTypes: [{ id: "software-engineering", label: "Software Engineering" }],
          globalInterviewTags: [],
        }).pipe(RpcClient.withHeaders(adminHeaders));

        yield* companyClient.upsertCompanyProfile({ name: "Acme Systems" }).pipe(
          RpcClient.withHeaders(companyHeaders),
        );
        const companyWithRecruiter = yield* companyClient.addRecruiter({
          name: "Nora Recruiter",
        }).pipe(RpcClient.withHeaders(companyHeaders));

        yield* studentClient.upsertStudentOnboarding({
          firstName: "Katherine",
          lastName: "Johnson",
          course: "Mathematics",
        }).pipe(RpcClient.withHeaders(studentHeaders));

        const selectedCvProfile = yield* cvProfileClient.createStudentCvProfile({
          profileTypeId: "software-engineering",
          fileName: "katherine-backend.pdf",
          contentType: "application/pdf",
          contentsBase64: Buffer.from("katherine-backend-cv", "utf8").toString("base64"),
        }).pipe(RpcClient.withHeaders(studentHeaders));

        const qrIdentity = yield* studentClient.issueStudentQrIdentity().pipe(
          RpcClient.withHeaders(studentHeaders),
        );

        const firstInterview = yield* interviewClient.completeInterview({
          recruiterId: companyWithRecruiter.recruiters[0]!.id,
          qrIdentity,
          cvProfileId: selectedCvProfile.id,
          score: 4.1,
          globalTagIds: [],
          companyTagLabels: [],
        }).pipe(RpcClient.withHeaders(companyHeaders));

        const renamedCompany = yield* companyClient.renameRecruiter({
          recruiterId: companyWithRecruiter.recruiters[0]!.id,
          name: "Nora Updated",
        }).pipe(RpcClient.withHeaders(companyHeaders));

        const secondInterview = yield* interviewClient.completeInterview({
          recruiterId: renamedCompany.recruiters[0]!.id,
          qrIdentity,
          cvProfileId: selectedCvProfile.id,
          score: 4.8,
          globalTagIds: [],
          companyTagLabels: [],
        }).pipe(RpcClient.withHeaders(companyHeaders));

        expect(firstInterview.recruiterName).toBe("Nora Recruiter");
        expect(secondInterview.recruiterName).toBe("Nora Updated");
        expect(firstInterview.cvProfileId).toBe(selectedCvProfile.id);
        expect(secondInterview.cvProfileId).toBe(selectedCvProfile.id);

        expect(
          yield* interviewClient.listCurrentCompanyInterviews().pipe(
            RpcClient.withHeaders(companyHeaders),
          ),
        ).toEqual([firstInterview, secondInterview]);
      }),
  );
});
