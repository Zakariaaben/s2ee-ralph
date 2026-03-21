import { type AuthenticatedActor, type Company } from "@project/domain";
import { Effect, Layer, ServiceMap } from "effect";
import * as HttpApiError from "effect/unstable/httpapi/HttpApiError";

import { CompanyRepository } from "../repositories/company-repository";

const requireCompanyActor = (actor: AuthenticatedActor) => {
  if (actor.role !== "company") {
    return Effect.fail(new HttpApiError.Forbidden({}));
  }

  return Effect.succeed(actor);
};

const normalizeName = (value: string) => {
  const normalized = value.trim();

  if (normalized.length === 0) {
    return Effect.fail(new HttpApiError.BadRequest({}));
  }

  return Effect.succeed(normalized);
};

export class CompanyService extends ServiceMap.Service<
  CompanyService,
  {
    readonly getCurrentCompany: (
      actor: AuthenticatedActor,
    ) => Effect.Effect<Company | null, HttpApiError.Forbidden>;
    readonly upsertCompanyProfile: (
      input: {
        readonly actor: AuthenticatedActor;
        readonly name: string;
      },
    ) => Effect.Effect<
      Company,
      HttpApiError.Forbidden | HttpApiError.BadRequest
    >;
    readonly addRecruiter: (
      input: {
        readonly actor: AuthenticatedActor;
        readonly name: string;
      },
    ) => Effect.Effect<
      Company,
      HttpApiError.Forbidden | HttpApiError.BadRequest | HttpApiError.NotFound
    >;
    readonly renameRecruiter: (
      input: {
        readonly actor: AuthenticatedActor;
        readonly recruiterId: string;
        readonly name: string;
      },
    ) => Effect.Effect<
      Company,
      HttpApiError.Forbidden | HttpApiError.BadRequest | HttpApiError.NotFound
    >;
  }
>()("@project/web/CompanyService") {
  static readonly layer = Layer.effect(
    CompanyService,
    Effect.gen(function*() {
      const companyRepository = yield* CompanyRepository;

      return CompanyService.of({
        getCurrentCompany: (actor) =>
          Effect.gen(function*() {
            const companyActor = yield* requireCompanyActor(actor);

            return yield* companyRepository.getByOwnerUserId(companyActor.id);
          }),
        upsertCompanyProfile: ({ actor, name }) =>
          Effect.gen(function*() {
            const companyActor = yield* requireCompanyActor(actor);
            const normalizedName = yield* normalizeName(name);

            return yield* companyRepository.upsertByOwnerUserId({
              ownerUserId: companyActor.id,
              name: normalizedName,
            });
          }),
        addRecruiter: ({ actor, name }) =>
          Effect.gen(function*() {
            const companyActor = yield* requireCompanyActor(actor);
            const normalizedName = yield* normalizeName(name);
            const currentCompany = yield* companyRepository.addRecruiter({
              ownerUserId: companyActor.id,
              name: normalizedName,
            });

            if (!currentCompany) {
              return yield* Effect.fail(new HttpApiError.NotFound({}));
            }

            return currentCompany;
          }),
        renameRecruiter: ({ actor, recruiterId, name }) =>
          Effect.gen(function*() {
            const companyActor = yield* requireCompanyActor(actor);
            const normalizedName = yield* normalizeName(name);
            const currentCompany = yield* companyRepository.renameRecruiter({
              ownerUserId: companyActor.id,
              recruiterId,
              name: normalizedName,
            });

            if (!currentCompany) {
              return yield* Effect.fail(new HttpApiError.NotFound({}));
            }

            return currentCompany;
          }),
      });
    }),
  ).pipe(Layer.provide(CompanyRepository.layer));
}
