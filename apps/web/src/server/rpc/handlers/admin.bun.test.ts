import { afterEach, beforeAll, describe, expect, it } from "bun:test";
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
  ActorRpcGroup,
  CompanyRpcGroup,
  CvProfileRpcGroup,
  InterviewRpcGroup,
  StudentRpcGroup,
  VenueRpcGroup,
  VocabularyRpcGroup,
} from "@project/rpc";
import { Effect } from "effect";
import * as RpcClient from "effect/unstable/rpc/RpcClient";
import { RpcTest } from "effect/unstable/rpc";

import {
  AdminRpcLive,
  ActorRpcLive,
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
  runLayerEffect,
  startPostgresAndStorageTestInfra,
  warnComposeTestInfraUnavailable,
} from "../test-support";

const AdminTestLive = makeRpcTestLive(
  AdminRpcLive,
  ActorRpcLive,
  CompanyRpcLive,
  CvProfileRpcLive,
  InterviewRpcLive,
  StudentRpcLive,
  VenueRpcLive,
  VocabularyRpcLive,
  AppRpcMiddlewareLive,
);

const makeAdminClient = RpcTest.makeClient(AdminRpcGroup);

const makeActorClient = RpcTest.makeClient(ActorRpcGroup);

const makeCompanyClient = RpcTest.makeClient(CompanyRpcGroup);

const makeCvProfileClient = RpcTest.makeClient(CvProfileRpcGroup);

const makeInterviewClient = RpcTest.makeClient(InterviewRpcGroup);

const makeStudentClient = RpcTest.makeClient(StudentRpcGroup);

const makeVenueClient = RpcTest.makeClient(VenueRpcGroup);

const makeVocabularyClient = RpcTest.makeClient(VocabularyRpcGroup);

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

  it(
    "admin actors can list the global company ledger with recruiter, placement, and arrival context",
    runLayerEffect(AdminTestLive, () =>
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
    ),
  );

  it(
    "admin actors can list the global interview ledger with company, student, CV, and status context across companies",
    runLayerEffect(AdminTestLive, () =>
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
        const issuedQrIdentity = yield* studentClient.issueStudentQrIdentity().pipe(
          RpcClient.withHeaders(studentHeaders),
        );
        expect(issuedQrIdentity).toContain(student.id);

        const completedInterview = yield* interviewClient.completeInterview({
          recruiterId: acmeWithRecruiter.recruiters[0]!.id,
          qrIdentity: student.id,
          cvProfileId: cv.id,
          score: 4.3,
          globalTagIds: [asGlobalInterviewTagId("curious")],
          companyTagLabels: ["Backend Ready"],
          notes: "Strong backend fit.",
        }).pipe(RpcClient.withHeaders(companyHeaders));
        const cancelledInterview = yield* interviewClient.cancelInterview({
          recruiterId: globexWithRecruiter.recruiters[0]!.id,
          qrIdentity: student.id,
          cvProfileId: cv.id,
          notes: "Candidate no-show at booth.",
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
    ),
  );

  it(
    "admin actors can list user access entries and persist role changes without dropping linked profile context",
    runLayerEffect(AdminTestLive, () =>
      Effect.gen(function*() {
        const adminHeaders = yield* provisionSessionHeaders("admin");
        const studentHeaders = yield* provisionSessionHeaders("student");
        const companyHeaders = yield* provisionSessionHeaders("company");
        const adminClient = yield* makeAdminClient;
        const companyClient = yield* makeCompanyClient;
        const studentClient = yield* makeStudentClient;

        const studentProfile = yield* studentClient.upsertStudentOnboarding({
          firstName: "Ada",
          lastName: "Lovelace",
          course: "Computer Science",
        }).pipe(RpcClient.withHeaders(studentHeaders));
        const companyProfile = yield* companyClient.upsertCompanyProfile({ name: "Acme Systems" }).pipe(
          RpcClient.withHeaders(companyHeaders),
        );

        const initialAccessLedger = yield* adminClient.listAdminAccessLedger().pipe(
          RpcClient.withHeaders(adminHeaders),
        );
        const studentEntry = initialAccessLedger.find(
          (entry) => entry.student?.id === studentProfile.id,
        );
        const companyEntry = initialAccessLedger.find(
          (entry) => entry.company?.id === companyProfile.id,
        );

        expect(studentEntry).toMatchObject({
          user: {
            role: "student",
          },
          student: studentProfile,
          company: null,
        });
        expect(companyEntry).toMatchObject({
          user: {
            role: "company",
          },
          student: null,
          company: companyProfile,
        });

        const updatedEntry = yield* adminClient.changeAdminUserRole({
          userId: companyEntry!.user.id,
          role: "check-in",
        }).pipe(RpcClient.withHeaders(adminHeaders));

        expect(updatedEntry).toMatchObject({
          user: {
            id: companyEntry!.user.id,
            role: "check-in",
          },
          student: null,
          company: companyProfile,
        });

        expect(
          yield* adminClient.listAdminAccessLedger().pipe(
            RpcClient.withHeaders(adminHeaders),
          ),
        ).toContainEqual(updatedEntry);
      }),
    ),
  );

  it(
    "non-admin actors cannot manage access and changed sessions immediately observe their new role",
    runLayerEffect(AdminTestLive, () =>
      Effect.gen(function*() {
        const adminHeaders = yield* provisionSessionHeaders("admin");
        const companyHeaders = yield* provisionSessionHeaders("company");
        const adminClient = yield* makeAdminClient;
        const actorClient = yield* makeActorClient;
        const companyActor = yield* actorClient.currentActor().pipe(
          RpcClient.withHeaders(companyHeaders),
        );

        const deniedListExit = yield* Effect.exit(
          adminClient.listAdminAccessLedger().pipe(RpcClient.withHeaders(companyHeaders)),
        );
        const deniedChangeExit = yield* Effect.exit(
          adminClient.changeAdminUserRole({
            userId: companyActor.id,
            role: "check-in",
          }).pipe(RpcClient.withHeaders(companyHeaders)),
        );

        expect(deniedListExit._tag).toBe("Failure");
        expect(deniedChangeExit._tag).toBe("Failure");

        yield* adminClient.changeAdminUserRole({
          userId: companyActor.id,
          role: "check-in",
        }).pipe(RpcClient.withHeaders(adminHeaders));

        expect(
          yield* actorClient.currentActor().pipe(
            RpcClient.withHeaders(companyHeaders),
          ),
        ).toMatchObject({
          id: companyActor.id,
          role: "check-in",
        });

        const companyAccessExit = yield* Effect.exit(
          actorClient.requireCompanyAccess().pipe(
            RpcClient.withHeaders(companyHeaders),
          ),
        );

        expect(companyAccessExit._tag).toBe("Failure");
        expect(
          yield* actorClient.requireCheckInAccess().pipe(
            RpcClient.withHeaders(companyHeaders),
          ),
        ).toMatchObject({
          id: companyActor.id,
          role: "check-in",
        });
      }),
    ),
  );
});
