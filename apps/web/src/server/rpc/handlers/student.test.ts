import { account, session, user } from "@project/db/schema/auth";
import { student as studentTable } from "@project/db/schema/student";
import { StudentRpcGroup } from "@project/rpc";
import { afterEach, beforeAll, describe, expect, it } from "@effect/vitest";
import { Effect } from "effect";
import * as RpcClient from "effect/unstable/rpc/RpcClient";
import { RpcTest } from "effect/unstable/rpc";

import { AppRpcMiddlewareLive, StudentRpcLive } from "../live";
import {
  makeRpcTestLive,
  provisionSessionHeaders,
  resetTables,
  startPostgresTestInfra,
} from "../test-support";

const StudentTestLive = makeRpcTestLive(
  StudentRpcLive,
  AppRpcMiddlewareLive,
);

const makeStudentClient = RpcTest.makeClient(StudentRpcGroup).pipe(
  Effect.provide(StudentTestLive),
);

beforeAll(() => {
  startPostgresTestInfra();
});

afterEach(async () => {
  await Effect.runPromise(resetTables([studentTable, session, account, user]));
});

describe("student rpc", () => {
  it.effect(
    "student actors can create and read back their onboarding record and issue a QR identity",
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
          course: "Computer Science",
        }).pipe(RpcClient.withHeaders(headers));

        expect(student.firstName).toBe("Ada");
        expect(student.lastName).toBe("Lovelace");
        expect(student.course).toBe("Computer Science");

        const after = yield* client.currentStudent().pipe(
          RpcClient.withHeaders(headers),
        );

        expect(after).toEqual(student);

        const qrIdentity = yield* client.issueStudentQrIdentity().pipe(
          RpcClient.withHeaders(headers),
        );

        expect(qrIdentity).toBe(`student:v1:${student.id}`);
      }),
  );

  it.effect(
    "company actors can resolve issued student QR identities while malformed payloads stay rejected",
    () =>
      Effect.gen(function*() {
        const studentHeaders = yield* provisionSessionHeaders("student");
        const companyHeaders = yield* provisionSessionHeaders("company");
        const client = yield* makeStudentClient;
        const student = yield* client.upsertStudentOnboarding({
          firstName: "Grace",
          lastName: "Hopper",
          course: "Computer Science",
        }).pipe(RpcClient.withHeaders(studentHeaders));
        const qrIdentity = yield* client.issueStudentQrIdentity().pipe(
          RpcClient.withHeaders(studentHeaders),
        );
        const resolved = yield* client.resolveStudentQrIdentity({ qrIdentity }).pipe(
          RpcClient.withHeaders(companyHeaders),
        );

        expect(resolved).toEqual(student);

        const wrongRoleExit = yield* Effect.exit(
          client.resolveStudentQrIdentity({ qrIdentity }).pipe(
            RpcClient.withHeaders(studentHeaders),
          ),
        );

        expect(wrongRoleExit._tag).toBe("Failure");

        const malformedExit = yield* Effect.exit(
          client.resolveStudentQrIdentity({ qrIdentity: "not-a-student-qr" }).pipe(
            RpcClient.withHeaders(companyHeaders),
          ),
        );

        expect(malformedExit._tag).toBe("Failure");
      }),
  );
});
