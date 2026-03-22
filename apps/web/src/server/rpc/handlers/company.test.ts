import { account, session, user } from "@project/db/schema/auth";
import { company as companyTable, recruiter } from "@project/db/schema/company";
import { CompanyRpcGroup } from "@project/rpc";
import { afterEach, beforeAll, describe, expect, it } from "@effect/vitest";
import { Effect, Layer } from "effect";
import * as RpcClient from "effect/unstable/rpc/RpcClient";
import { RpcTest } from "effect/unstable/rpc";

import { AppRpcMiddlewareLive, CompanyRpcLive } from "../live";
import {
  getComposeTestInfraAvailability,
  makeRpcTestLive,
  provisionSessionHeaders,
  resetTables,
  startPostgresTestInfra,
  warnComposeTestInfraUnavailable,
} from "../test-support";

const CompanyTestLive = makeRpcTestLive(
  CompanyRpcLive,
  AppRpcMiddlewareLive,
);

const makeCompanyClient = RpcTest.makeClient(CompanyRpcGroup);

const postgresTestInfra = getComposeTestInfraAvailability();

if (!postgresTestInfra.available) {
  warnComposeTestInfraUnavailable(postgresTestInfra);
}

afterEach(async () => {
  await Effect.runPromise(
    resetTables([recruiter, companyTable, session, account, user]),
  );
});

const describeWithPostgres = postgresTestInfra.available ? describe : describe.skip;

describeWithPostgres("company rpc", () => {
  beforeAll(() => {
    startPostgresTestInfra();
  });

  it.effect("company mutations persist already-decoded names while blank names stay rejected", () =>
    Effect.gen(function*() {
      const headers = yield* provisionSessionHeaders("company");
      const client = yield* makeCompanyClient;
      const blankProfileExit = yield* Effect.exit(
        client.upsertCompanyProfile({ name: "   " }).pipe(
          RpcClient.withHeaders(headers),
        ),
      );

      expect(blankProfileExit._tag).toBe("Failure");
      expect(
        yield* client.currentCompany().pipe(RpcClient.withHeaders(headers)),
      ).toBeNull();

      const company = yield* client.upsertCompanyProfile({
        name: "Acme Systems",
      }).pipe(RpcClient.withHeaders(headers));

      expect(company.name).toBe("Acme Systems");

      const withRecruiter = yield* client.addRecruiter({
        name: "Nora Recruiter",
      }).pipe(RpcClient.withHeaders(headers));

      expect(withRecruiter.recruiters).toEqual([
        {
          id: withRecruiter.recruiters[0]!.id,
          name: "Nora Recruiter",
        },
      ]);

      const renamed = yield* client.renameRecruiter({
        recruiterId: withRecruiter.recruiters[0]!.id,
        name: "Nora Updated",
      }).pipe(RpcClient.withHeaders(headers));

      expect(renamed.recruiters).toEqual([
        {
          id: withRecruiter.recruiters[0]!.id,
          name: "Nora Updated",
        },
      ]);
    }).pipe(Effect.provide(Layer.fresh(CompanyTestLive))));

  it.effect("company actors can create and read back their onboarding record", () =>
    Effect.gen(function*() {
      const headers = yield* provisionSessionHeaders("company");
      const client = yield* makeCompanyClient;
      const before = yield* client.currentCompany().pipe(
        RpcClient.withHeaders(headers),
      );

      expect(before).toBeNull();

      const company = yield* client.upsertCompanyProfile({ name: "Acme Systems" }).pipe(
        RpcClient.withHeaders(headers),
      );

      expect(company.name).toBe("Acme Systems");
      expect(company.recruiters).toEqual([]);

      const after = yield* client.currentCompany().pipe(
        RpcClient.withHeaders(headers),
      );

      expect(after).toEqual(company);
    }).pipe(Effect.provide(Layer.fresh(CompanyTestLive))));

  it.effect("recruiter roster updates stay scoped to the owning company account", () =>
    Effect.gen(function*() {
      const headers = yield* provisionSessionHeaders("company");
      const otherHeaders = yield* provisionSessionHeaders("company");
      const client = yield* makeCompanyClient;

      yield* client.upsertCompanyProfile({ name: "Acme Systems" }).pipe(
        RpcClient.withHeaders(headers),
      );

      const withRecruiter = yield* client.addRecruiter({ name: "Nora Recruiter" }).pipe(
        RpcClient.withHeaders(headers),
      );

      const renamed = yield* client.renameRecruiter({
        recruiterId: withRecruiter.recruiters[0]!.id,
        name: "Nora Updated",
      }).pipe(RpcClient.withHeaders(headers));

      expect(renamed.recruiters).toEqual([
        {
          id: withRecruiter.recruiters[0]!.id,
          name: "Nora Updated",
        },
      ]);

      yield* client.upsertCompanyProfile({ name: "Beta Systems" }).pipe(
        RpcClient.withHeaders(otherHeaders),
      );

      const foreignRenameExit = yield* Effect.exit(
        client.renameRecruiter({
          recruiterId: withRecruiter.recruiters[0]!.id,
          name: "Wrong Company Update",
        }).pipe(RpcClient.withHeaders(otherHeaders)),
      );

      expect(foreignRenameExit._tag).toBe("Failure");

      const afterForeignAttempt = yield* client.currentCompany().pipe(
        RpcClient.withHeaders(headers),
      );

      expect(afterForeignAttempt?.recruiters).toEqual([
        {
          id: withRecruiter.recruiters[0]!.id,
          name: "Nora Updated",
        },
      ]);
    }).pipe(Effect.provide(Layer.fresh(CompanyTestLive))));
});
