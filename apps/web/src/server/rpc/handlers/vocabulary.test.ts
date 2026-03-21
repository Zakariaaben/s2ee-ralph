import { account, session, user } from "@project/db/schema/auth";
import {
  cvProfileType,
  globalInterviewTag,
} from "@project/db/schema/vocabulary";
import { VocabularyRpcGroup } from "@project/rpc";
import { afterEach, beforeAll, describe, expect, it } from "@effect/vitest";
import { Effect } from "effect";
import * as RpcClient from "effect/unstable/rpc/RpcClient";
import { RpcTest } from "effect/unstable/rpc";

import { AppRpcMiddlewareLive, VocabularyRpcLive } from "../live";
import {
  getComposeTestInfraAvailability,
  makeRpcTestLive,
  provisionSessionHeaders,
  resetTables,
  startPostgresTestInfra,
  warnComposeTestInfraUnavailable,
} from "../test-support";

const VocabularyTestLive = makeRpcTestLive(
  VocabularyRpcLive,
  AppRpcMiddlewareLive,
);

const makeVocabularyClient = RpcTest.makeClient(VocabularyRpcGroup).pipe(
  Effect.provide(VocabularyTestLive),
);

const postgresTestInfra = getComposeTestInfraAvailability();

if (!postgresTestInfra.available) {
  warnComposeTestInfraUnavailable(postgresTestInfra);
}

afterEach(async () => {
  await Effect.runPromise(
    resetTables([globalInterviewTag, cvProfileType, session, account, user]),
  );
});

const describeWithPostgres = postgresTestInfra.available ? describe : describe.skip;

describeWithPostgres("vocabulary rpc", () => {
  beforeAll(() => {
    startPostgresTestInfra();
  });

  it.effect(
    "admin actors can seed controlled vocabularies and authenticated actors can read them back",
    () =>
      Effect.gen(function*() {
        const adminHeaders = yield* provisionSessionHeaders("admin");
        const studentHeaders = yield* provisionSessionHeaders("student");
        const client = yield* makeVocabularyClient;

        const seeded = yield* client.seedControlledVocabularies({
          cvProfileTypes: [
            { id: "software-engineering", label: "Software Engineering" },
            { id: "data-science", label: "Data Science" },
          ],
          globalInterviewTags: [
            { id: "strong-fit", label: "Strong Fit" },
            { id: "follow-up", label: "Follow Up" },
          ],
        }).pipe(RpcClient.withHeaders(adminHeaders));

        expect(seeded.cvProfileTypes).toEqual([
          { id: "software-engineering", label: "Software Engineering" },
          { id: "data-science", label: "Data Science" },
        ]);
        expect(seeded.globalInterviewTags).toEqual([
          { id: "strong-fit", label: "Strong Fit" },
          { id: "follow-up", label: "Follow Up" },
        ]);

        expect(
          yield* client.listCvProfileTypes().pipe(
            RpcClient.withHeaders(studentHeaders),
          ),
        ).toEqual(seeded.cvProfileTypes);
        expect(
          yield* client.listGlobalInterviewTags().pipe(
            RpcClient.withHeaders(studentHeaders),
          ),
        ).toEqual(seeded.globalInterviewTags);
      }),
  );

  it.effect(
    "non-admin actors cannot reseed vocabularies and admin reseeding replaces the prior set",
    () =>
      Effect.gen(function*() {
        const adminHeaders = yield* provisionSessionHeaders("admin");
        const companyHeaders = yield* provisionSessionHeaders("company");
        const client = yield* makeVocabularyClient;

        yield* client.seedControlledVocabularies({
          cvProfileTypes: [
            { id: "backend", label: "Backend" },
          ],
          globalInterviewTags: [
            { id: "hire", label: "Hire" },
          ],
        }).pipe(RpcClient.withHeaders(adminHeaders));

        const wrongRoleExit = yield* Effect.exit(
          client.seedControlledVocabularies({
            cvProfileTypes: [
              { id: "frontend", label: "Frontend" },
            ],
            globalInterviewTags: [
              { id: "maybe", label: "Maybe" },
            ],
          }).pipe(RpcClient.withHeaders(companyHeaders)),
        );

        expect(wrongRoleExit._tag).toBe("Failure");

        yield* client.seedControlledVocabularies({
          cvProfileTypes: [
            { id: "product", label: "Product" },
          ],
          globalInterviewTags: [
            { id: "refer", label: "Refer" },
            { id: "intern", label: "Intern Track" },
          ],
        }).pipe(RpcClient.withHeaders(adminHeaders));

        expect(
          yield* client.listCvProfileTypes().pipe(
            RpcClient.withHeaders(companyHeaders),
          ),
        ).toEqual([{ id: "product", label: "Product" }]);
        expect(
          yield* client.listGlobalInterviewTags().pipe(
            RpcClient.withHeaders(companyHeaders),
          ),
        ).toEqual([
          { id: "refer", label: "Refer" },
          { id: "intern", label: "Intern Track" },
        ]);
      }),
  );
});
