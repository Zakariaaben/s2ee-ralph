import { afterEach, beforeAll, describe, expect, it } from "bun:test";
import { account, session, user } from "@project/db/schema/auth";
import { cvProfile } from "@project/db/schema/cv-profile";
import { student as studentTable } from "@project/db/schema/student";
import { cvProfileType } from "@project/db/schema/vocabulary";
import {
  CvProfileRpcGroup,
  StudentRpcGroup,
  VocabularyRpcGroup,
} from "@project/rpc";
import { Effect } from "effect";
import * as RpcClient from "effect/unstable/rpc/RpcClient";
import { RpcTest } from "effect/unstable/rpc";

import {
  AppRpcMiddlewareLive,
  CvProfileRpcLive,
  StudentRpcLive,
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

const CvProfileTestLive = makeRpcTestLive(
  CvProfileRpcLive,
  StudentRpcLive,
  VocabularyRpcLive,
  AppRpcMiddlewareLive,
);

const makeCvProfileClient = RpcTest.makeClient(CvProfileRpcGroup);

const makeStudentClient = RpcTest.makeClient(StudentRpcGroup);

const makeVocabularyClient = RpcTest.makeClient(VocabularyRpcGroup);

const storageTestInfra = getComposeTestInfraAvailability();

if (!storageTestInfra.available) {
  warnComposeTestInfraUnavailable(storageTestInfra);
}

afterEach(async () => {
  await Effect.runPromise(
    resetTables([cvProfile, cvProfileType, studentTable, session, account, user]),
  );
});

const describeWithStorage = storageTestInfra.available ? describe : describe.skip;

describeWithStorage("cv profile rpc", () => {
  beforeAll(() => {
    startPostgresAndStorageTestInfra();
  });

  it(
    "cv profile creation rejects blank metadata and malformed base64 while valid controlled profiles succeed",
    runLayerEffect(CvProfileTestLive, () =>
      Effect.gen(function*() {
        const adminHeaders = yield* provisionSessionHeaders("admin");
        const studentHeaders = yield* provisionSessionHeaders("student");
        const cvProfileClient = yield* makeCvProfileClient;
        const studentClient = yield* makeStudentClient;
        const vocabularyClient = yield* makeVocabularyClient;

        yield* vocabularyClient.seedControlledVocabularies({
          cvProfileTypes: [{ id: "software-engineering", label: "Software Engineering" }],
          globalInterviewTags: [],
        }).pipe(RpcClient.withHeaders(adminHeaders));

        yield* studentClient.upsertStudentOnboarding({
          firstName: "Ada",
          lastName: "Lovelace",
          course: "Computer Science",
        }).pipe(RpcClient.withHeaders(studentHeaders));

        const blankMetadataExit = yield* Effect.exit(
          cvProfileClient.createStudentCvProfile({
            profileTypeId: "   ",
            fileName: "ada-software.pdf",
            contentType: "application/pdf",
            contentsBase64: Buffer.from("software-cv-v1", "utf8").toString("base64"),
          }).pipe(RpcClient.withHeaders(studentHeaders)),
        );

        expect(blankMetadataExit._tag).toBe("Failure");
        expect(
          yield* cvProfileClient.listCurrentStudentCvProfiles().pipe(
            RpcClient.withHeaders(studentHeaders),
          ),
        ).toEqual([]);

        const malformedContentsExit = yield* Effect.exit(
          cvProfileClient.createStudentCvProfile({
            profileTypeId: "software-engineering",
            fileName: "ada-software.pdf",
            contentType: "application/pdf",
            contentsBase64: "not-base64",
          }).pipe(RpcClient.withHeaders(studentHeaders)),
        );

        expect(malformedContentsExit._tag).toBe("Failure");
        expect(
          yield* cvProfileClient.listCurrentStudentCvProfiles().pipe(
            RpcClient.withHeaders(studentHeaders),
          ),
        ).toEqual([]);

        const createdCv = yield* cvProfileClient.createStudentCvProfile({
          profileTypeId: "software-engineering",
          fileName: "ada-software.pdf",
          contentType: "application/pdf",
          contentsBase64: Buffer.from("software-cv-v1", "utf8").toString("base64"),
        }).pipe(RpcClient.withHeaders(studentHeaders));

        expect(createdCv.profileType.id as string).toBe("software-engineering");
        expect(createdCv.fileName).toBe("ada-software.pdf");
        expect(createdCv.contentType).toBe("application/pdf");
      }),
    ),
  );

  it(
    "student actors can create controlled CV profiles, download stored files, and company actors can list them after QR resolution",
    runLayerEffect(CvProfileTestLive, () =>
      Effect.gen(function*() {
        const adminHeaders = yield* provisionSessionHeaders("admin");
        const studentHeaders = yield* provisionSessionHeaders("student");
        const companyHeaders = yield* provisionSessionHeaders("company");
        const cvProfileClient = yield* makeCvProfileClient;
        const studentClient = yield* makeStudentClient;
        const vocabularyClient = yield* makeVocabularyClient;

        yield* vocabularyClient.seedControlledVocabularies({
          cvProfileTypes: [
            { id: "software-engineering", label: "Software Engineering" },
            { id: "data-science", label: "Data Science" },
          ],
          globalInterviewTags: [],
        }).pipe(RpcClient.withHeaders(adminHeaders));

        const student = yield* studentClient.upsertStudentOnboarding({
          firstName: "Ada",
          lastName: "Lovelace",
          course: "Computer Science",
        }).pipe(RpcClient.withHeaders(studentHeaders));

        const softwareCv = yield* cvProfileClient.createStudentCvProfile({
          profileTypeId: "software-engineering",
          fileName: "ada-software.pdf",
          contentType: "application/pdf",
          contentsBase64: Buffer.from("software-cv-v1", "utf8").toString("base64"),
        }).pipe(RpcClient.withHeaders(studentHeaders));

        const dataCv = yield* cvProfileClient.createStudentCvProfile({
          profileTypeId: "data-science",
          fileName: "ada-data.pdf",
          contentType: "application/pdf",
          contentsBase64: Buffer.from("data-cv-v1", "utf8").toString("base64"),
        }).pipe(RpcClient.withHeaders(studentHeaders));

        expect(
          yield* cvProfileClient.listCurrentStudentCvProfiles().pipe(
            RpcClient.withHeaders(studentHeaders),
          ),
        ).toEqual([softwareCv, dataCv]);

        expect(
          yield* cvProfileClient.downloadStudentCvProfileFile({
            cvProfileId: softwareCv.id,
          }).pipe(RpcClient.withHeaders(studentHeaders)),
        ).toEqual({
          cvProfileId: softwareCv.id,
          fileName: "ada-software.pdf",
          contentType: "application/pdf",
          contentsBase64: Buffer.from("software-cv-v1", "utf8").toString("base64"),
        });

        const issuedQrIdentity = yield* studentClient.issueStudentQrIdentity().pipe(
          RpcClient.withHeaders(studentHeaders),
        );
        expect(issuedQrIdentity).toContain(student.id);
        const resolvedStudent = yield* studentClient.resolveStudentQrIdentity({
          qrIdentity: student.id,
        }).pipe(RpcClient.withHeaders(companyHeaders));

        expect(resolvedStudent.id).toBe(student.id);
        expect(
          yield* cvProfileClient.listStudentCvProfiles({
            studentId: resolvedStudent.id,
          }).pipe(RpcClient.withHeaders(companyHeaders)),
        ).toEqual([softwareCv, dataCv]);
      }),
    ),
  );

  it(
    "students replace immutable CV files by deleting and reuploading a fresh profile",
    runLayerEffect(CvProfileTestLive, () =>
      Effect.gen(function*() {
        const adminHeaders = yield* provisionSessionHeaders("admin");
        const studentHeaders = yield* provisionSessionHeaders("student");
        const cvProfileClient = yield* makeCvProfileClient;
        const studentClient = yield* makeStudentClient;
        const vocabularyClient = yield* makeVocabularyClient;

        yield* vocabularyClient.seedControlledVocabularies({
          cvProfileTypes: [{ id: "software-engineering", label: "Software Engineering" }],
          globalInterviewTags: [],
        }).pipe(RpcClient.withHeaders(adminHeaders));

        yield* studentClient.upsertStudentOnboarding({
          firstName: "Grace",
          lastName: "Hopper",
          course: "Computer Science",
        }).pipe(RpcClient.withHeaders(studentHeaders));

        const originalCv = yield* cvProfileClient.createStudentCvProfile({
          profileTypeId: "software-engineering",
          fileName: "grace-v1.pdf",
          contentType: "application/pdf",
          contentsBase64: Buffer.from("grace-cv-v1", "utf8").toString("base64"),
        }).pipe(RpcClient.withHeaders(studentHeaders));

        expect(
          yield* cvProfileClient.deleteStudentCvProfile({
            cvProfileId: originalCv.id,
          }).pipe(RpcClient.withHeaders(studentHeaders)),
        ).toBe(originalCv.id);

        expect(
          yield* cvProfileClient.listCurrentStudentCvProfiles().pipe(
            RpcClient.withHeaders(studentHeaders),
          ),
        ).toEqual([]);

        const deletedDownloadExit = yield* Effect.exit(
          cvProfileClient.downloadStudentCvProfileFile({
            cvProfileId: originalCv.id,
          }).pipe(RpcClient.withHeaders(studentHeaders)),
        );

        expect(deletedDownloadExit._tag).toBe("Failure");

        const replacementCv = yield* cvProfileClient.createStudentCvProfile({
          profileTypeId: "software-engineering",
          fileName: "grace-v2.pdf",
          contentType: "application/pdf",
          contentsBase64: Buffer.from("grace-cv-v2", "utf8").toString("base64"),
        }).pipe(RpcClient.withHeaders(studentHeaders));

        expect(replacementCv.id).not.toBe(originalCv.id);
        expect(
          yield* cvProfileClient.downloadStudentCvProfileFile({
            cvProfileId: replacementCv.id,
          }).pipe(RpcClient.withHeaders(studentHeaders)),
        ).toEqual({
          cvProfileId: replacementCv.id,
          fileName: "grace-v2.pdf",
          contentType: "application/pdf",
          contentsBase64: Buffer.from("grace-cv-v2", "utf8").toString("base64"),
        });
      }),
    ),
  );

  it(
    "unknown profile types stay rejected and company actors cannot create student CV profiles",
    runLayerEffect(CvProfileTestLive, () =>
      Effect.gen(function*() {
        const studentHeaders = yield* provisionSessionHeaders("student");
        const companyHeaders = yield* provisionSessionHeaders("company");
        const cvProfileClient = yield* makeCvProfileClient;
        const studentClient = yield* makeStudentClient;

        yield* studentClient.upsertStudentOnboarding({
          firstName: "Katherine",
          lastName: "Johnson",
          course: "Mathematics",
        }).pipe(RpcClient.withHeaders(studentHeaders));

        const unknownTypeExit = yield* Effect.exit(
          cvProfileClient.createStudentCvProfile({
            profileTypeId: "unknown",
            fileName: "katherine.pdf",
            contentType: "application/pdf",
            contentsBase64: Buffer.from("katherine-cv", "utf8").toString("base64"),
          }).pipe(RpcClient.withHeaders(studentHeaders)),
        );

        expect(unknownTypeExit._tag).toBe("Failure");

        const wrongRoleExit = yield* Effect.exit(
          cvProfileClient.createStudentCvProfile({
            profileTypeId: "unknown",
            fileName: "company.pdf",
            contentType: "application/pdf",
            contentsBase64: Buffer.from("company-cv", "utf8").toString("base64"),
          }).pipe(RpcClient.withHeaders(companyHeaders)),
        );

        expect(wrongRoleExit._tag).toBe("Failure");
      }),
    ),
  );
});
