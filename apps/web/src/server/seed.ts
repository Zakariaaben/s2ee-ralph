import { makeAuth } from "@project/auth";
import { DB, DatabaseLive } from "@project/db";
import { user } from "@project/db/schema/auth";
import { company } from "@project/db/schema/company";
import { room } from "@project/db/schema/venue";
import { ServerEnvLive } from "@project/env/server";
import { eq, inArray } from "drizzle-orm";
import { Effect, Layer } from "effect";

type SeedUser = {
  readonly name: string;
  readonly email: string;
  readonly password: string;
  readonly role: "admin" | "company" | "student";
};

const usersSeed: ReadonlyArray<SeedUser> = [
  {
    name: "Platform Admin",
    email: "admin.seed@project.local",
    password: "SeedPass123!",
    role: "admin",
  },
  {
    name: "Acme Talent",
    email: "acme.seed@project.local",
    password: "SeedPass123!",
    role: "company",
  },
  {
    name: "Globex Recruiting",
    email: "globex.seed@project.local",
    password: "SeedPass123!",
    role: "company",
  },
  {
    name: "Initech Hiring",
    email: "initech.seed@project.local",
    password: "SeedPass123!",
    role: "company",
  },
  {
    name: "Ari Student",
    email: "student.one.seed@project.local",
    password: "SeedPass123!",
    role: "student",
  },
  {
    name: "Mina Student",
    email: "student.two.seed@project.local",
    password: "SeedPass123!",
    role: "student",
  },
];

const roomsSeed = [
  { id: "seed-room-a", code: "A" },
  { id: "seed-room-b", code: "B" },
  { id: "seed-room-c", code: "C" },
] as const;

const companiesSeed = [
  {
    id: "seed-company-acme",
    ownerEmail: "acme.seed@project.local",
    name: "Acme Corp",
    roomId: "seed-room-a",
    standNumber: 1,
    arrivalStatus: "arrived" as const,
  },
  {
    id: "seed-company-globex",
    ownerEmail: "globex.seed@project.local",
    name: "Globex Corporation",
    roomId: "seed-room-a",
    standNumber: 2,
    arrivalStatus: "not-arrived" as const,
  },
  {
    id: "seed-company-initech",
    ownerEmail: "initech.seed@project.local",
    name: "Initech",
    roomId: "seed-room-b",
    standNumber: 1,
    arrivalStatus: "not-arrived" as const,
  },
] as const;

const recreateAuthUser = (seededUser: SeedUser) =>
  Effect.gen(function*() {
    const db = yield* DB;
    const auth = yield* makeAuth;

    const signUpResult = yield* Effect.promise(() =>
      auth.api.signUpEmail({
        body: {
          email: seededUser.email,
          password: seededUser.password,
          name: seededUser.name,
        },
      }),
    );

    const createdUserId =
      (signUpResult as { user?: { id?: string } } | null)?.user?.id ?? null;

    if (!createdUserId) {
      return yield* Effect.fail(
        new Error(`Signup did not return a user id for ${seededUser.email}`),
      );
    }

    yield* Effect.promise(() =>
      db
        .update(user)
        .set({
          role: seededUser.role,
          emailVerified: true,
          updatedAt: new Date(),
        })
        .where(eq(user.id, createdUserId)),
    );

    return createdUserId;
  });

const program = Effect.gen(function*() {
  const db = yield* DB;
  const userIdsByEmail = new Map<string, string>();

  const seedEmails = usersSeed.map((seededUser) => seededUser.email);

  yield* Effect.promise(() =>
    db
      .delete(user)
      .where(inArray(user.email, seedEmails)),
  );

  for (const seededUser of usersSeed) {
    const userId = yield* recreateAuthUser(seededUser);

    userIdsByEmail.set(seededUser.email, userId);
  }

  yield* Effect.promise(() =>
    db.transaction(async (tx) => {
      for (const seededRoom of roomsSeed) {
        await tx
          .insert(room)
          .values({
            id: seededRoom.id,
            code: seededRoom.code,
          })
          .onConflictDoUpdate({
            target: room.id,
            set: {
              code: seededRoom.code,
              updatedAt: new Date(),
            },
          });
      }

      for (const seededCompany of companiesSeed) {
        const ownerUserId = userIdsByEmail.get(seededCompany.ownerEmail);

        if (!ownerUserId) {
          throw new Error(
            `Missing owner user for company seed: ${seededCompany.ownerEmail}`,
          );
        }

        await tx
          .insert(company)
          .values({
            id: seededCompany.id,
            ownerUserId,
            name: seededCompany.name,
            roomId: seededCompany.roomId,
            standNumber: seededCompany.standNumber,
            arrivalStatus: seededCompany.arrivalStatus,
          })
          .onConflictDoUpdate({
            target: company.id,
            set: {
              ownerUserId,
              name: seededCompany.name,
              roomId: seededCompany.roomId,
              standNumber: seededCompany.standNumber,
              arrivalStatus: seededCompany.arrivalStatus,
              updatedAt: new Date(),
            },
          });
      }
    }),
  );

  return usersSeed.map((seededUser) => ({
    email: seededUser.email,
    password: seededUser.password,
    role: seededUser.role,
  }));
});

Effect.runPromise(
  program.pipe(Effect.provide(Layer.mergeAll(ServerEnvLive, DatabaseLive))),
)
  .then((credentials) => {
    console.log("Seeded users, companies, and rooms.");
    console.table(credentials);
  })
  .catch((error) => {
    console.error("Failed to seed database.", error);
    process.exitCode = 1;
  });
