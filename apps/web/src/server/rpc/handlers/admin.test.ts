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
import { room } from "@project/db/schema/venue";
import { cvProfileType, globalInterviewTag } from "@project/db/schema/vocabulary";
import { type GlobalInterviewTag as GlobalInterviewTagModel } from "@project/domain";
import {
  AdminRpcGroup,
  CompanyRpcGroup,
  CvProfileRpcGroup,
  InterviewRpcGroup,
  StudentRpcGroup,
  VenueRpcGroup,
  VocabularyRpcGroup,
} from "@project/rpc";
import { afterEach, beforeAll, describe, expect, it } from "@effect/vitest";
import { Effect } from "effect";
import * as RpcClient from "effect/unstable/rpc/RpcClient";
import { RpcTest } from "effect/unstable/rpc";

import {
  AdminRpcLive,
  AppRpcMiddlewareLive,
  CompanyRpcLive,
  CvProfileRpcLive,
  InterviewRpcLive,
  StudentRpcLive,
  VenueRpcLive,
  VocabularyRpcLive,
} from "../live";
import {
  getComposeTestInfraAvailability,
  makeRpcTestLive,
  provisionSessionHeaders,
  resetTables,
  startPostgresAndStorageTestInfra,
  warnComposeTestInfraUnavailable,
} from "../test-support";

const AdminTestLive = makeRpcTestLive(
  AdminRpcLive,
  CompanyRpcLive,
  CvProfileRpcLive,
  InterviewRpcLive,
  StudentRpcLive,
  VenueRpcLive,
  VocabularyRpcLive,
  AppRpcMiddlewareLive,
);

const makeAdminClient = RpcTest.makeClient(AdminRpcGroup).pipe(
  Effect.provide(AdminTestLive),
);

const makeCompanyClient = RpcTest.makeClient(CompanyRpcGroup).pipe(
  Effect.provide(AdminTestLive),
);

const makeCvProfileClient = RpcTest.makeClient(CvProfileRpcGroup).pipe(
  Effect.provide(AdminTestLive),
);

const makeInterviewClient = RpcTest.makeClient(InterviewRpcGroup).pipe(
  Effect.provide(AdminTestLive),
);

const makeStudentClient = RpcTest.makeClient(StudentRpcGroup).pipe(
  Effect.provide(AdminTestLive),
);

const makeVenueClient = RpcTest.makeClient(VenueRpcGroup).pipe(
  Effect.provide(AdminTestLive),
);

const makeVocabularyClient = RpcTest.makeClient(VocabularyRpcGroup).pipe(
  Effect.provide(AdminTestLive),
);

const asGlobalInterviewTagId = (value: string) =>
  value as GlobalInterviewTagModel["id"];

const storageTestInfra = getComposeTestInfraAvailability();

if (!storageTestInfra.available) {
  warnComposeTestInfraUnavailable(storageTestInfra);
}

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
      room,
      studentTable,
      session,
      account,
      user,
    ]),
  );
});

const describeWithStorage = storageTestInfra.available ? describe : describe.skip;

describeWithStorage("admin rpc", () => {
  beforeAll(() => {
    startPostgresAndStorageTestInfra();
  });

  it.effect(
    "admin actors can list the global company ledger with recruiter, placement, and arrival context",
    () =>
      Effect.gen(function*() {
        const adminHeaders = yield* provisionSessionHeaders("admin");
        const companyHeaders = yield* provisionSessionHeaders("company");
        const otherCompanyHeaders = yield* provisionSessionHeaders("company");
        const checkInHeaders = yield* provisionSessionHeaders("check-in");
        const adminClient = yield* makeAdminClient;
        const companyClient = yield* makeCompanyClient;
        const venueClient = yield* makeVenueClient;

        const createdRoom = yield* venueClient.createRoom({ code: "S27" }).pipe(
          RpcClient.withHeaders(adminHeaders),
        );
        const acme = yield* companyClient.upsertCompanyProfile({ name: "Acme Systems" }).pipe(
          RpcClient.withHeaders(companyHeaders),
        );
        const acmeWithRecruiter = yield* companyClient.addRecruiter({
          name: "Nora Recruiter",
        }).pipe(RpcClient.withHeaders(companyHeaders));
        const globex = yield* companyClient.upsertCompanyProfile({ name: "Globex" }).pipe(
          RpcClient.withHeaders(otherCompanyHeaders),
        );

        yield* venueClient.assignCompanyPlacement({
          companyId: acme.id,
          roomId: createdRoom.id,
          standNumber: 12,
        }).pipe(RpcClient.withHeaders(adminHeaders));
        yield* venueClient.markCompanyArrived({ companyId: acme.id }).pipe(
          RpcClient.withHeaders(checkInHeaders),
        );

        expect(
          yield* adminClient.listAdminCompanyLedger().pipe(
            RpcClient.withHeaders(adminHeaders),
          ),
        ).toEqual([
          {
            company: acmeWithRecruiter,
            room: createdRoom,
            standNumber: 12,
            arrivalStatus: "arrived",
          },
          {
            company: globex,
            room: null,
            standNumber: null,
            arrivalStatus: "not-arrived",
          },
        ]);
      }),
  );

  it.effect(
    "admin actors can list the global interview ledger with company, student, CV, and status context across companies",
    () =>
      Effect.gen(function*() {
        const adminHeaders = yield* provisionSessionHeaders("admin");
        const companyHeaders = yield* provisionSessionHeaders("company");
        const otherCompanyHeaders = yield* provisionSessionHeaders("company");
        const studentHeaders = yield* provisionSessionHeaders("student");
        const adminClient = yield* makeAdminClient;
        const companyClient = yield* makeCompanyClient;
        const cvProfileClient = yield* makeCvProfileClient;
        const interviewClient = yield* makeInterviewClient;
        const studentClient = yield* makeStudentClient;
        const venueClient = yield* makeVenueClient;
        const vocabularyClient = yield* makeVocabularyClient;

        yield* vocabularyClient.seedControlledVocabularies({
          cvProfileTypes: [{ id: "software-engineering", label: "Software Engineering" }],
          globalInterviewTags: [{ id: "curious", label: "Curious" }],
        }).pipe(RpcClient.withHeaders(adminHeaders));

        const createdRoom = yield* venueClient.createRoom({ code: "CP3" }).pipe(
          RpcClient.withHeaders(adminHeaders),
        );
        const acme = yield* companyClient.upsertCompanyProfile({ name: "Acme Systems" }).pipe(
          RpcClient.withHeaders(companyHeaders),
        );
        const acmeWithRecruiter = yield* companyClient.addRecruiter({
          name: "Nora Recruiter",
        }).pipe(RpcClient.withHeaders(companyHeaders));
        const globex = yield* companyClient.upsertCompanyProfile({ name: "Globex" }).pipe(
          RpcClient.withHeaders(otherCompanyHeaders),
        );
        const globexWithRecruiter = yield* companyClient.addRecruiter({
          name: "Iris Recruiter",
        }).pipe(RpcClient.withHeaders(otherCompanyHeaders));

        yield* venueClient.assignCompanyPlacement({
          companyId: acme.id,
          roomId: createdRoom.id,
          standNumber: 7,
        }).pipe(RpcClient.withHeaders(adminHeaders));

        const student = yield* studentClient.upsertStudentOnboarding({
          firstName: "Ada",
          lastName: "Lovelace",
          course: "Computer Science",
        }).pipe(RpcClient.withHeaders(studentHeaders));
        const cv = yield* cvProfileClient.createStudentCvProfile({
          profileTypeId: "software-engineering",
          fileName: "ada-backend.pdf",
          contentType: "application/pdf",
          contentsBase64: Buffer.from("ada-backend-cv", "utf8").toString("base64"),
        }).pipe(RpcClient.withHeaders(studentHeaders));
        const qrIdentity = yield* studentClient.issueStudentQrIdentity().pipe(
          RpcClient.withHeaders(studentHeaders),
        );

        const completedInterview = yield* interviewClient.completeInterview({
          recruiterId: acmeWithRecruiter.recruiters[0]!.id,
          qrIdentity,
          cvProfileId: cv.id,
          score: 4.3,
          globalTagIds: [asGlobalInterviewTagId("curious")],
          companyTagLabels: ["Backend Ready"],
        }).pipe(RpcClient.withHeaders(companyHeaders));
        const cancelledInterview = yield* interviewClient.cancelInterview({
          recruiterId: globexWithRecruiter.recruiters[0]!.id,
          qrIdentity,
          cvProfileId: cv.id,
        }).pipe(RpcClient.withHeaders(otherCompanyHeaders));

        expect(
          yield* adminClient.listAdminInterviewLedger().pipe(
            RpcClient.withHeaders(adminHeaders),
          ),
        ).toEqual([
          {
            interview: completedInterview,
            company: {
              id: acme.id,
              name: "Acme Systems",
              room: createdRoom,
              standNumber: 7,
              arrivalStatus: "not-arrived",
            },
            student,
            cvProfile: cv,
          },
          {
            interview: cancelledInterview,
            company: {
              id: globex.id,
              name: "Globex",
              room: null,
              standNumber: null,
              arrivalStatus: "not-arrived",
            },
            student,
            cvProfile: cv,
          },
        ]);
      }),
  );

  it.effect("non-admin actors cannot read the admin oversight ledgers", () =>
    Effect.gen(function*() {
      const companyHeaders = yield* provisionSessionHeaders("company");
      const client = yield* makeAdminClient;
      const exit = yield* Effect.exit(
        client.listAdminCompanyLedger().pipe(RpcClient.withHeaders(companyHeaders)),
      );

      expect(exit._tag).toBe("Failure");
    }));
});
