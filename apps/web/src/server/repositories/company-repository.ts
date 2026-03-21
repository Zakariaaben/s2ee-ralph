import { DB } from "@project/db";
import { company, recruiter } from "@project/db/schema/company";
import { Company, Recruiter } from "@project/domain";
import { and, asc, eq } from "drizzle-orm";
import { Effect, Layer, ServiceMap } from "effect";

const makeCompanyId = () => crypto.randomUUID();
const makeRecruiterId = () => crypto.randomUUID();

const toCompany = (
  companyRow: typeof company.$inferSelect,
  recruiterRows: ReadonlyArray<typeof recruiter.$inferSelect>,
) =>
  new Company({
    id: companyRow.id as Company["id"],
    name: companyRow.name,
    recruiters: recruiterRows.map(
      (row) =>
        new Recruiter({
          id: row.id as Recruiter["id"],
          name: row.name,
        }),
    ),
  });

export class CompanyRepository extends ServiceMap.Service<
  CompanyRepository,
  {
    readonly getByOwnerUserId: (
      ownerUserId: string,
    ) => Effect.Effect<Company | null>;
    readonly upsertByOwnerUserId: (
      input: {
        readonly ownerUserId: string;
        readonly name: string;
      },
    ) => Effect.Effect<Company>;
    readonly addRecruiter: (
      input: {
        readonly ownerUserId: string;
        readonly name: string;
      },
    ) => Effect.Effect<Company | null>;
    readonly renameRecruiter: (
      input: {
        readonly ownerUserId: string;
        readonly recruiterId: string;
        readonly name: string;
      },
    ) => Effect.Effect<Company | null>;
  }
>()("@project/web/CompanyRepository") {
  static readonly layer = Layer.effect(
    CompanyRepository,
    Effect.gen(function*() {
      const db = yield* DB;

      const getCompanyRowByOwnerUserId = (ownerUserId: string) =>
        Effect.promise(() =>
          db
            .select()
            .from(company)
            .where(eq(company.ownerUserId, ownerUserId))
            .limit(1)
            .then((rows) => rows[0] ?? null),
        );

      const getRecruiterRowsByCompanyId = (companyId: string) =>
        Effect.promise(() =>
          db
            .select()
            .from(recruiter)
            .where(eq(recruiter.companyId, companyId))
            .orderBy(asc(recruiter.createdAt), asc(recruiter.id)),
        );

      const loadCompanyByOwnerUserId = (ownerUserId: string) =>
        Effect.gen(function*() {
          const companyRow = yield* getCompanyRowByOwnerUserId(ownerUserId);

          if (!companyRow) {
            return null;
          }

          const recruiterRows = yield* getRecruiterRowsByCompanyId(companyRow.id);

          return toCompany(companyRow, recruiterRows);
        });

      return CompanyRepository.of({
        getByOwnerUserId: loadCompanyByOwnerUserId,
        upsertByOwnerUserId: ({ ownerUserId, name }) =>
          Effect.gen(function*() {
            yield* Effect.promise(() =>
              db
                .insert(company)
                .values({
                  id: makeCompanyId(),
                  ownerUserId,
                  name,
                })
                .onConflictDoUpdate({
                  target: company.ownerUserId,
                  set: {
                    name,
                    updatedAt: new Date(),
                  },
                }),
            );

            const savedCompany = yield* loadCompanyByOwnerUserId(ownerUserId);

            if (!savedCompany) {
              return yield* Effect.die("Company upsert did not return a company");
            }

            return savedCompany;
          }),
        addRecruiter: ({ ownerUserId, name }) =>
          Effect.gen(function*() {
            const companyRow = yield* getCompanyRowByOwnerUserId(ownerUserId);

            if (!companyRow) {
              return null;
            }

            yield* Effect.promise(() =>
              db.insert(recruiter).values({
                id: makeRecruiterId(),
                companyId: companyRow.id,
                name,
              }),
            );

            return yield* loadCompanyByOwnerUserId(ownerUserId);
          }),
        renameRecruiter: ({ ownerUserId, recruiterId, name }) =>
          Effect.gen(function*() {
            const companyRow = yield* getCompanyRowByOwnerUserId(ownerUserId);

            if (!companyRow) {
              return null;
            }

            const updatedRecruiters = yield* Effect.promise(() =>
              db
                .update(recruiter)
                .set({
                  name,
                  updatedAt: new Date(),
                })
                .where(and(eq(recruiter.id, recruiterId), eq(recruiter.companyId, companyRow.id)))
                .returning({ id: recruiter.id }),
            );

            if (updatedRecruiters.length === 0) {
              return null;
            }

            return yield* loadCompanyByOwnerUserId(ownerUserId);
          }),
      });
    }),
  );
}
