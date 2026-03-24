import { account, session, user } from "@project/db/schema/auth";
import { student as studentTable } from "@project/db/schema/student";
import { StudentRpcGroup } from "@project/rpc";
import { afterEach, beforeAll, describe, expect, it } from "@effect/vitest";
import { Effect, Layer } from "effect";
import * as RpcClient from "effect/unstable/rpc/RpcClient";
import { RpcTest } from "effect/unstable/rpc";

import { AppRpcMiddlewareLive, StudentRpcLive } from "../live";
import {
  getComposeTestInfraAvailability,
  makeRpcTestLive,
  provisionSessionHeaders,
  resetTables,
  startPostgresTestInfra,
  warnComposeTestInfraUnavailable,
} from "../test-support";

const StudentTestLive = makeRpcTestLive(
  StudentRpcLive,
  AppRpcMiddlewareLive,
);

const makeStudentClient = RpcTest.makeClient(StudentRpcGroup);

const postgresTestInfra = getComposeTestInfraAvailability();

if (!postgresTestInfra.available) {
  warnComposeTestInfraUnavailable(postgresTestInfra);
}

afterEach(async () => {
  await Effect.runPromise(resetTables([studentTable, session, account, user]));
});

const describeWithPostgres = postgresTestInfra.available ? describe : describe.skip;

describeWithPostgres("student rpc", () => {
  beforeAll(() => {
    startPostgresTestInfra();
  });

  it.effect(
    "student actors can create, update, and read back onboarding including optional profile image state",
    () =>
      Effect.gen(function*() {
        const headers = yield* provisionSessionHeaders("student");
        const client = yield* makeStudentClient;
        const before = yield* client.currentStudent().pipe(
          RpcClient.withHeaders(headers),
        );

        expect(before).toBeNull();

        const student = yield* client.upsertStudentOnboarding({
          firstName: "Ada",
          lastName: "Lovelace",
          phoneNumber: "+213 555 12 34",
          academicYear: "5th year",
          major: "Computer Science",
          institution: "ESI",
          image: "https://example.com/ada.png",
        }).pipe(RpcClient.withHeaders(headers));

        expect(student.firstName).toBe("Ada");
        expect(student.lastName).toBe("Lovelace");
        expect(student.phoneNumber).toBe("+213 555 12 34");
        expect(student.academicYear).toBe("5th year");
        expect(student.major).toBe("Computer Science");
        expect(student.institution).toBe("ESI");
        expect(student.image).toBe("https://example.com/ada.png");

        const after = yield* client.currentStudent().pipe(
          RpcClient.withHeaders(headers),
        );

        expect(after).toEqual(student);

        const updatedStudent = yield* client.upsertStudentOnboarding({
          firstName: "Ada",
          lastName: "Lovelace",
          phoneNumber: "+213 555 12 34",
          academicYear: "5th year",
          major: "Software Engineering",
          institution: "ESI",
          image: null,
        }).pipe(RpcClient.withHeaders(headers));
        const afterImageClear = yield* client.currentStudent().pipe(
          RpcClient.withHeaders(headers),
        );

        expect(updatedStudent.image).toBeNull();
        expect(updatedStudent.major).toBe("Software Engineering");
        expect(afterImageClear).toEqual(updatedStudent);

        const qrIdentity = yield* client.issueStudentQrIdentity().pipe(
          RpcClient.withHeaders(headers),
        );

        expect(qrIdentity).toBe(`student:v1:${updatedStudent.id}`);
      }).pipe(Effect.provide(Layer.fresh(StudentTestLive))),
  );

  it.effect(
    "company actors can resolve issued student QR identities while malformed payloads stay rejected after transport decoding",
    () =>
      Effect.gen(function*() {
        const studentHeaders = yield* provisionSessionHeaders("student");
        const companyHeaders = yield* provisionSessionHeaders("company");
        const client = yield* makeStudentClient;
        const student = yield* client.upsertStudentOnboarding({
          firstName: "Grace",
          lastName: "Hopper",
          phoneNumber: "+213 555 00 99",
          academicYear: "4th year",
          major: "Computer Science",
          institution: "ESI",
          image: null,
        }).pipe(RpcClient.withHeaders(studentHeaders));
        const qrIdentity = yield* client.issueStudentQrIdentity().pipe(
          RpcClient.withHeaders(studentHeaders),
        );
        expect(qrIdentity).toContain(student.id);
        const resolved = yield* client.resolveStudentQrIdentity({
          qrIdentity: student.id,
        }).pipe(
          RpcClient.withHeaders(companyHeaders),
        );

        expect(resolved).toEqual(student);

        const wrongRoleExit = yield* Effect.exit(
          client.resolveStudentQrIdentity({ qrIdentity: student.id }).pipe(
            RpcClient.withHeaders(studentHeaders),
          ),
        );

        expect(wrongRoleExit._tag).toBe("Failure");

        const malformedExit = yield* Effect.exit(
          client.resolveStudentQrIdentity({ qrIdentity: "not-a-student-qr" }).pipe(
            RpcClient.withHeaders(companyHeaders),
          ),
        );
        const blankOnboardingExit = yield* Effect.exit(
          client.upsertStudentOnboarding({
            firstName: "  ",
            lastName: "Hopper",
            phoneNumber: "+213 555 00 99",
            academicYear: "4th year",
            major: "Computer Science",
            institution: "ESI",
            image: null,
          }).pipe(RpcClient.withHeaders(studentHeaders)),
        );

        expect(malformedExit._tag).toBe("Failure");
        expect(blankOnboardingExit._tag).toBe("Failure");
      }).pipe(Effect.provide(Layer.fresh(StudentTestLive))),
  );
});
