import { makeAuth } from "@project/auth";
import { DB } from "@project/db";
import { account, user } from "@project/db/schema/auth";
import { company, featuredCompany, recruiter } from "@project/db/schema/company";
import { cvProfile } from "@project/db/schema/cv-profile";
import {
  interview as interviewTable,
  interviewCompanyTag,
  interviewGlobalTag,
} from "@project/db/schema/interview";
import { student } from "@project/db/schema/student";
import { room, zone } from "@project/db/schema/venue";
import {
  AdminAccessLedgerEntry,
  AdminCompanyLedgerEntry,
  AdminInterviewLedgerCompany,
  AdminInterviewLedgerEntry,
  Company,
  CompanyInterviewTag,
  CvProfile,
  CvProfileType,
  FeaturedCompany,
  GlobalInterviewTag,
  Interview,
  Recruiter,
  Room,
  Student,
  User,
  Zone,
  encodeCvProfilePresentationCode,
  type UserRoleValue,
} from "@project/domain";
import { asc, eq, inArray } from "drizzle-orm";
import { DateTime, Effect, Layer, Option, ServiceMap } from "effect";

const makeCompanyId = () => crypto.randomUUID();
const makeFeaturedCompanyId = () => crypto.randomUUID();

const toZone = (zoneRow: typeof zone.$inferSelect | null) =>
  zoneRow == null
    ? null
    : new Zone({
        id: zoneRow.id as Zone["id"],
        code: zoneRow.code,
        label: zoneRow.label,
        latitude: zoneRow.latitude,
        longitude: zoneRow.longitude,
      });

const toRoom = (roomRow: typeof room.$inferSelect) =>
  new Room({
    id: roomRow.id as Room["id"],
    code: roomRow.code,
    zone: null,
  });

const toCompany = (
  companyRow: typeof company.$inferSelect,
  recruiterRows: ReadonlyArray<typeof recruiter.$inferSelect>,
) =>
  new Company({
    id: companyRow.id as Company["id"],
    name: companyRow.name,
    logoUrl: companyRow.logoUrl,
    recruiters: recruiterRows.map(
      (row) =>
        new Recruiter({
          id: row.id as Recruiter["id"],
          name: row.name,
        }),
    ),
  });

const toFeaturedCompany = (row: typeof featuredCompany.$inferSelect) =>
  new FeaturedCompany({
    id: row.id,
    name: row.name,
    description: row.description,
    logoLabel: row.logoLabel,
    profiles: [...row.profiles],
    employmentCount: row.employmentCount,
    workerInternshipCount: row.workerInternshipCount,
    practicalInternshipCount: row.practicalInternshipCount,
    pfeCount: row.pfeCount,
    sortOrder: row.sortOrder,
    isPublished: row.isPublished,
  });

const toStudent = (studentRow: typeof student.$inferSelect) =>
  new Student({
    id: studentRow.id as Student["id"],
    firstName: studentRow.firstName,
    lastName: studentRow.lastName,
    phoneNumber: studentRow.phoneNumber,
    academicYear: studentRow.academicYear,
    major: studentRow.major,
    institution: studentRow.institution,
    image: null,
  });

const toUser = (userRow: typeof user.$inferSelect) =>
  new User({
    id: userRow.id as User["id"],
    name: userRow.name,
    email: userRow.email,
    role: userRow.role,
    emailVerified: userRow.emailVerified,
    image: userRow.image,
    createdAt: DateTime.make(userRow.createdAt)!,
    updatedAt: DateTime.make(userRow.updatedAt)!,
  });

const toCvProfile = (cvProfileRow: typeof cvProfile.$inferSelect) =>
  new CvProfile({
    id: cvProfileRow.id as CvProfile["id"],
    studentId: cvProfileRow.studentId as CvProfile["studentId"],
    presentationCode: encodeCvProfilePresentationCode(cvProfileRow.id),
    profileType: new CvProfileType({
      id: cvProfileRow.profileTypeId as CvProfileType["id"],
      label: cvProfileRow.profileTypeLabel,
    }),
    fileName: cvProfileRow.fileName,
    contentType: cvProfileRow.contentType,
    fileSizeBytes: cvProfileRow.fileSizeBytes,
  });

export class AdminRepository extends ServiceMap.Service<
  AdminRepository,
  {
    readonly listAccessLedger: () => Effect.Effect<
      ReadonlyArray<AdminAccessLedgerEntry>
    >;
    readonly changeUserRole: (input: {
      readonly userId: string;
      readonly role: UserRoleValue;
    }) => Effect.Effect<
      | { readonly _tag: "updated"; readonly entry: AdminAccessLedgerEntry }
      | { readonly _tag: "not-found" }
      | { readonly _tag: "incompatible-profile" }
    >;
    readonly createCompanyAccount: (input: {
      readonly companyName: string;
      readonly email: string;
      readonly password: string;
      readonly logoUrl: string | undefined;
      readonly zoneCode: string | undefined;
      readonly roomCode: string | undefined;
    }) => Effect.Effect<AdminAccessLedgerEntry, Error>;
    readonly listZones: () => Effect.Effect<ReadonlyArray<Zone>>;
    readonly listFeaturedCompanies: (input?: {
      readonly publishedOnly?: boolean;
    }) => Effect.Effect<ReadonlyArray<FeaturedCompany>>;
    readonly upsertFeaturedCompany: (input: {
      readonly id: string | null;
      readonly name: string;
      readonly description: string;
      readonly logoLabel: string;
      readonly profiles: ReadonlyArray<string>;
      readonly employmentCount: number;
      readonly workerInternshipCount: number;
      readonly practicalInternshipCount: number;
      readonly pfeCount: number;
      readonly sortOrder: number;
      readonly isPublished: boolean;
    }) => Effect.Effect<FeaturedCompany, Error>;
    readonly deleteFeaturedCompany: (input: { readonly id: string }) => Effect.Effect<boolean>;
    readonly listCompanyLedger: () => Effect.Effect<
      ReadonlyArray<AdminCompanyLedgerEntry>
    >;
    readonly listInterviewLedger: () => Effect.Effect<
      ReadonlyArray<AdminInterviewLedgerEntry>
    >;
    readonly updateCompany: (input: {
      readonly companyId: string;
      readonly name: Option.Option<string>;
      readonly email: Option.Option<string>;
      readonly password: Option.Option<string>;
      readonly logoUrl: Option.Option<string>;
      readonly zoneCode: Option.Option<string>;
      readonly roomCode: Option.Option<string>;
    }) => Effect.Effect<AdminCompanyLedgerEntry, Error>;
    readonly deleteCompany: (input: {
      readonly companyId: string;
    }) => Effect.Effect<boolean, Error>;
    readonly createZone: (input: {
      readonly code: string;
      readonly label: string;
      readonly latitude: number | undefined;
      readonly longitude: number | undefined;
    }) => Effect.Effect<Zone, Error>;
    readonly updateZone: (input: {
      readonly zoneId: string;
      readonly code: string;
      readonly label: string;
      readonly latitude: number | undefined;
      readonly longitude: number | undefined;
    }) => Effect.Effect<Zone | null, Error>;
    readonly deleteZone: (input: { readonly zoneId: string }) => Effect.Effect<boolean>;
    readonly importCompaniesCsv: (input: {
      readonly csvContents: string;
    }) => Effect.Effect<number, Error>;
  }
>()("@project/web/AdminRepository") {
  static readonly layer = Layer.effect(
    AdminRepository,
    Effect.gen(function*() {
      const db = yield* DB;
      const auth = yield* makeAuth;

      const getRecruitersByCompanyIds = (companyIds: ReadonlyArray<string>) =>
        Effect.gen(function*() {
          if (companyIds.length === 0) {
            return new Map<string, Array<typeof recruiter.$inferSelect>>();
          }

          const recruiterRows = yield* Effect.promise(() =>
            db
              .select()
              .from(recruiter)
              .where(inArray(recruiter.companyId, companyIds))
              .orderBy(asc(recruiter.companyId), asc(recruiter.createdAt), asc(recruiter.id)),
          );
          const recruitersByCompanyId = new Map<
            string,
            Array<typeof recruiter.$inferSelect>
          >();

          for (const recruiterRow of recruiterRows) {
            const current = recruitersByCompanyId.get(recruiterRow.companyId) ?? [];

            current.push(recruiterRow);
            recruitersByCompanyId.set(recruiterRow.companyId, current);
          }

          return recruitersByCompanyId;
        });

      const loadAccessEntryByUserId = (userId: string) =>
        Effect.gen(function*() {
          const accessRows = yield* Effect.promise(() =>
            db
              .select({
                userRow: user,
                studentRow: student,
                companyRow: company,
              })
              .from(user)
              .leftJoin(student, eq(student.ownerUserId, user.id))
              .leftJoin(company, eq(company.ownerUserId, user.id))
              .where(eq(user.id, userId))
              .limit(1),
          );
          const accessRow = accessRows[0];

          if (!accessRow) {
            return null;
          }

          const recruitersByCompanyId = yield* getRecruitersByCompanyIds(
            accessRow.companyRow ? [accessRow.companyRow.id] : [],
          );

          return new AdminAccessLedgerEntry({
            user: toUser(accessRow.userRow),
            student: accessRow.studentRow ? toStudent(accessRow.studentRow) : null,
            company: accessRow.companyRow
              ? toCompany(
                  accessRow.companyRow,
                  recruitersByCompanyId.get(accessRow.companyRow.id) ?? [],
                )
              : null,
          });
        });

      const validateRoleTransition = (
        accessEntry: AdminAccessLedgerEntry,
        nextRole: UserRoleValue,
      ): boolean => {
        const hasStudentProfile = accessEntry.student != null;
        const hasCompanyProfile = accessEntry.company != null;

        if (hasStudentProfile && hasCompanyProfile) {
          return false;
        }

        if (hasStudentProfile && nextRole !== "student") {
          return false;
        }

        if (hasCompanyProfile && nextRole !== "company") {
          return false;
        }

        return true;
      };

      const normalizeCode = (value: string) => value.trim().toUpperCase();
      const normalizeOptionalText = (value: string | undefined | null) => {
        const trimmed = value?.trim() ?? "";

        return trimmed.length === 0 ? null : trimmed;
      };

      const parseCsvLine = (line: string): Array<string> => {
        const values: Array<string> = [];
        let current = "";
        let quoted = false;

        for (let index = 0; index < line.length; index += 1) {
          const character = line[index];

          if (character === '"') {
            if (quoted && line[index + 1] === '"') {
              current += '"';
              index += 1;
              continue;
            }

            quoted = !quoted;
            continue;
          }

          if (character === "," && !quoted) {
            values.push(current.trim());
            current = "";
            continue;
          }

          current += character;
        }

        values.push(current.trim());

        return values;
      };

      const getZoneByCode = async (code: string) => {
        const normalizedCode = normalizeCode(code);
        const rows = await db.select().from(zone).where(eq(zone.code, normalizedCode)).limit(1);

        return rows[0] ?? null;
      };

      const ensureZoneByCode = async (code: string | null) => {
        if (code == null) {
          return null;
        }

        const normalizedCode = normalizeCode(code);
        const existing = await getZoneByCode(normalizedCode);

        if (existing) {
          return existing;
        }

        const inserted = await db
          .insert(zone)
          .values({
            id: crypto.randomUUID(),
            code: normalizedCode,
            label: normalizedCode,
            latitude: null,
            longitude: null,
          })
          .returning();

        return inserted[0] ?? null;
      };

      const getRoomByCode = async (code: string) => {
        const normalizedCode = normalizeCode(code);
        const rows = await db.select().from(room).where(eq(room.code, normalizedCode)).limit(1);

        return rows[0] ?? null;
      };

      const ensureRoomByCode = async (code: string | null, zoneId: string | null) => {
        if (code == null) {
          return null;
        }

        const normalizedCode = normalizeCode(code);
        const existing = await getRoomByCode(normalizedCode);

        if (existing) {
          if (zoneId != null && existing.zoneId !== zoneId) {
            const updated = await db
              .update(room)
              .set({ zoneId, updatedAt: new Date() })
              .where(eq(room.id, existing.id))
              .returning();

            return updated[0] ?? existing;
          }

          return existing;
        }

        const inserted = await db
          .insert(room)
          .values({
            id: crypto.randomUUID(),
            code: normalizedCode,
            zoneId,
          })
          .returning();

        return inserted[0] ?? null;
      };

      const loadCompanyLedgerEntryByCompanyId = (companyId: string) =>
        Effect.gen(function*() {
          const companyRows = yield* Effect.promise(() =>
            db
              .select({
                companyRow: company,
                roomRow: room,
                zoneRow: zone,
              })
              .from(company)
              .leftJoin(room, eq(company.roomId, room.id))
              .leftJoin(zone, eq(company.zoneId, zone.id))
              .where(eq(company.id, companyId))
              .limit(1),
          );

          const row = companyRows[0];

          if (!row) {
            return null;
          }

          const recruitersByCompanyId = yield* getRecruitersByCompanyIds([companyId]);

          return new AdminCompanyLedgerEntry({
            company: toCompany(row.companyRow, recruitersByCompanyId.get(companyId) ?? []),
            zone: toZone(row.zoneRow),
            room: row.roomRow
              ? new Room({
                  id: row.roomRow.id as Room["id"],
                  code: row.roomRow.code,
                  zone: toZone(row.zoneRow),
                })
              : null,
            arrivalStatus: row.companyRow.arrivalStatus,
          });
        });

      const createCompanyAccountRecord = async (input: {
        readonly companyName: string;
        readonly email: string;
        readonly password: string;
        readonly logoUrl: string | undefined;
        readonly zoneCode: string | undefined;
        readonly roomCode: string | undefined;
      }) => {
        let createdUserId: string | null = null;

        try {
          const authContext = await auth.$context;
          const normalizedEmail = input.email.toLowerCase();

          if (await authContext.internalAdapter.findUserByEmail(normalizedEmail)) {
            throw new Error("A user already exists for this email.");
          }

          const passwordHash = await authContext.password.hash(input.password);
          const createdUser = await authContext.internalAdapter.createUser({
            email: normalizedEmail,
            emailVerified: true,
            image: null,
            name: input.companyName,
            role: "company",
          });
          const nextUserId = createdUser?.id ?? null;

          if (nextUserId == null) {
            throw new Error("Company account creation did not return a user.");
          }

          createdUserId = nextUserId;

          await authContext.internalAdapter.linkAccount({
            accountId: nextUserId,
            password: passwordHash,
            providerId: "credential",
            userId: nextUserId,
          });

          const ensuredZone = await ensureZoneByCode(normalizeOptionalText(input.zoneCode));
          const ensuredRoom = await ensureRoomByCode(
            normalizeOptionalText(input.roomCode),
            ensuredZone?.id ?? null,
          );

          await db.insert(company).values({
            id: makeCompanyId(),
            ownerUserId: nextUserId,
            name: input.companyName,
            logoUrl: normalizeOptionalText(input.logoUrl),
            zoneId: ensuredZone?.id ?? ensuredRoom?.zoneId ?? null,
            roomId: ensuredRoom?.id ?? null,
          });

          const accessEntry = await Effect.runPromise(loadAccessEntryByUserId(nextUserId));

          if (!accessEntry) {
            throw new Error("Created company account could not be loaded.");
          }

          return accessEntry;
        } catch (error) {
          if (createdUserId != null) {
            await db.delete(user).where(eq(user.id, createdUserId));
          }

          throw error instanceof Error ? error : new Error("Company account creation failed.");
        }
      };

      return AdminRepository.of({
        listFeaturedCompanies: (input) =>
          Effect.gen(function*() {
            const publishedOnly = input?.publishedOnly ?? false;
            const rows = yield* Effect.promise(() => {
              const query = db.select().from(featuredCompany).$dynamic();

              if (publishedOnly) {
                query.where(eq(featuredCompany.isPublished, true));
              }

              return query.orderBy(asc(featuredCompany.sortOrder), asc(featuredCompany.name));
            });

            return rows.map(toFeaturedCompany);
          }),
        upsertFeaturedCompany: (input) =>
          Effect.gen(function*() {
            const id = input.id ?? makeFeaturedCompanyId();
            const rows = yield* Effect.promise(() =>
              db
                .insert(featuredCompany)
                .values({
                  id,
                  name: input.name,
                  description: input.description,
                  logoLabel: input.logoLabel,
                  profiles: [...input.profiles],
                  employmentCount: input.employmentCount,
                  workerInternshipCount: input.workerInternshipCount,
                  practicalInternshipCount: input.practicalInternshipCount,
                  pfeCount: input.pfeCount,
                  sortOrder: input.sortOrder,
                  isPublished: input.isPublished,
                })
                .onConflictDoUpdate({
                  target: featuredCompany.id,
                  set: {
                    name: input.name,
                    description: input.description,
                    logoLabel: input.logoLabel,
                    profiles: [...input.profiles],
                    employmentCount: input.employmentCount,
                    workerInternshipCount: input.workerInternshipCount,
                    practicalInternshipCount: input.practicalInternshipCount,
                    pfeCount: input.pfeCount,
                    sortOrder: input.sortOrder,
                    isPublished: input.isPublished,
                    updatedAt: new Date(),
                  },
                })
                .returning(),
            );
            const saved = rows[0];

            if (!saved) {
              return yield* Effect.fail(new Error("Featured company upsert did not return a row"));
            }

            return toFeaturedCompany(saved);
          }),
        deleteFeaturedCompany: ({ id }) =>
          Effect.gen(function*() {
            const rows = yield* Effect.promise(() =>
              db
                .delete(featuredCompany)
                .where(eq(featuredCompany.id, id))
                .returning({ id: featuredCompany.id }),
            );

            return rows.length > 0;
          }),
        listAccessLedger: () =>
          Effect.gen(function*() {
            const accessRows = yield* Effect.promise(() =>
              db
                .select({
                  userRow: user,
                  studentRow: student,
                  companyRow: company,
                })
                .from(user)
                .leftJoin(student, eq(student.ownerUserId, user.id))
                .leftJoin(company, eq(company.ownerUserId, user.id))
                .orderBy(asc(user.createdAt), asc(user.id)),
            );

            if (accessRows.length === 0) {
              return [];
            }

            const recruitersByCompanyId = yield* getRecruitersByCompanyIds(
              accessRows.flatMap(({ companyRow }) => (companyRow ? [companyRow.id] : [])),
            );

            return accessRows.map(
              ({ userRow, studentRow, companyRow }) =>
                new AdminAccessLedgerEntry({
                  user: toUser(userRow),
                  student: studentRow ? toStudent(studentRow) : null,
                  company: companyRow
                    ? toCompany(companyRow, recruitersByCompanyId.get(companyRow.id) ?? [])
                    : null,
                }),
            );
          }),
        changeUserRole: ({ userId, role }) =>
          Effect.gen(function*() {
            const currentEntry = yield* loadAccessEntryByUserId(userId);

            if (currentEntry == null) {
              return { _tag: "not-found" } as const;
            }

            if (!validateRoleTransition(currentEntry, role)) {
              return { _tag: "incompatible-profile" } as const;
            }

            const updatedUsers = yield* Effect.promise(() =>
              db
                .update(user)
                .set({
                  role,
                  updatedAt: new Date(),
                })
                .where(eq(user.id, userId))
                .returning({ id: user.id }),
            );

            if (updatedUsers.length === 0) {
              return { _tag: "not-found" } as const;
            }

            const updatedEntry = yield* loadAccessEntryByUserId(userId);

            if (updatedEntry == null) {
              return { _tag: "not-found" } as const;
            }

            return { _tag: "updated", entry: updatedEntry } as const;
          }),
        createCompanyAccount: ({ companyName, email, password, logoUrl, zoneCode, roomCode }) =>
          Effect.promise(() =>
            createCompanyAccountRecord({
              companyName,
              email,
              password,
              logoUrl,
              zoneCode,
              roomCode,
            }),
          ),
        listZones: () =>
          Effect.promise(async () => {
            const zoneRows = await db.select().from(zone).orderBy(asc(zone.code));

            return zoneRows.map((zoneRow) => toZone(zoneRow)!);
          }),
        listCompanyLedger: () =>
          Effect.gen(function*() {
            const companyRows = yield* Effect.promise(() =>
              db
                .select({
                  companyRow: company,
                  roomRow: room,
                  zoneRow: zone,
                })
                .from(company)
                .leftJoin(room, eq(company.roomId, room.id))
                .leftJoin(zone, eq(company.zoneId, zone.id))
                .orderBy(asc(company.name), asc(company.id)),
            );

            if (companyRows.length === 0) {
              return [];
            }

            const recruitersByCompanyId = yield* getRecruitersByCompanyIds(
              companyRows.map(({ companyRow }) => companyRow.id),
            );

            return companyRows.map(
              ({ companyRow, roomRow, zoneRow }) =>
                new AdminCompanyLedgerEntry({
                  company: toCompany(
                    companyRow,
                    recruitersByCompanyId.get(companyRow.id) ?? [],
                  ),
                  zone: toZone(zoneRow),
                  room: roomRow ? new Room({ id: roomRow.id as Room["id"], code: roomRow.code, zone: toZone(zoneRow) }) : null,
                  arrivalStatus: companyRow.arrivalStatus,
                }),
            );
          }),
        listInterviewLedger: () =>
          Effect.gen(function*() {
            const interviewRows = yield* Effect.promise(() =>
              db
                .select({
                  interviewRow: interviewTable,
                  companyRow: company,
                  roomRow: room,
                  studentRow: student,
                  cvProfileRow: cvProfile,
                })
                .from(interviewTable)
                .innerJoin(company, eq(interviewTable.companyId, company.id))
                .leftJoin(room, eq(company.roomId, room.id))
                .innerJoin(student, eq(interviewTable.studentId, student.id))
                .innerJoin(cvProfile, eq(interviewTable.cvProfileId, cvProfile.id))
                .orderBy(asc(interviewTable.createdAt), asc(interviewTable.id)),
            );

            if (interviewRows.length === 0) {
              return [];
            }

            const interviewIds = interviewRows.map(({ interviewRow }) => interviewRow.id);
            const globalTagRows = yield* Effect.promise(() =>
              db
                .select()
                .from(interviewGlobalTag)
                .where(inArray(interviewGlobalTag.interviewId, interviewIds))
                .orderBy(
                  asc(interviewGlobalTag.interviewId),
                  asc(interviewGlobalTag.sortOrder),
                  asc(interviewGlobalTag.globalTagId),
                ),
            );
            const companyTagRows = yield* Effect.promise(() =>
              db
                .select()
                .from(interviewCompanyTag)
                .where(inArray(interviewCompanyTag.interviewId, interviewIds))
                .orderBy(
                  asc(interviewCompanyTag.interviewId),
                  asc(interviewCompanyTag.sortOrder),
                  asc(interviewCompanyTag.companyTagId),
                ),
            );
            const globalTagsByInterviewId = new Map<
              string,
              Array<typeof interviewGlobalTag.$inferSelect>
            >();
            const companyTagsByInterviewId = new Map<
              string,
              Array<typeof interviewCompanyTag.$inferSelect>
            >();

            for (const globalTagRow of globalTagRows) {
              const current = globalTagsByInterviewId.get(globalTagRow.interviewId) ?? [];

              current.push(globalTagRow);
              globalTagsByInterviewId.set(globalTagRow.interviewId, current);
            }

            for (const companyTagRow of companyTagRows) {
              const current = companyTagsByInterviewId.get(companyTagRow.interviewId) ?? [];

              current.push(companyTagRow);
              companyTagsByInterviewId.set(companyTagRow.interviewId, current);
            }

            return interviewRows.map(
              ({ interviewRow, companyRow, roomRow, studentRow, cvProfileRow }) =>
                new AdminInterviewLedgerEntry({
                  interview: new Interview({
                    id: interviewRow.id as Interview["id"],
                    companyId: interviewRow.companyId as Interview["companyId"],
                    studentId: interviewRow.studentId as Interview["studentId"],
                    cvProfileId: interviewRow.cvProfileId as Interview["cvProfileId"],
                    recruiterName: interviewRow.recruiterName,
                    status: interviewRow.status,
                    score: interviewRow.score ?? null,
                    notes: interviewRow.notes,
                    globalTags: (globalTagsByInterviewId.get(interviewRow.id) ?? []).map(
                      (row) =>
                        new GlobalInterviewTag({
                          id: row.globalTagId as GlobalInterviewTag["id"],
                          label: row.globalTagLabel,
                        }),
                    ),
                    companyTags: (companyTagsByInterviewId.get(interviewRow.id) ?? []).map(
                      (row) =>
                        new CompanyInterviewTag({
                          id: row.companyTagId as CompanyInterviewTag["id"],
                          label: row.companyTagLabel,
                        }),
                    ),
                  }),
                  company: new AdminInterviewLedgerCompany({
                    id: companyRow.id as AdminInterviewLedgerCompany["id"],
                    name: companyRow.name,
                    zone: null,
                    room: roomRow ? toRoom(roomRow) : null,
                    arrivalStatus: companyRow.arrivalStatus,
                  }),
                  student: toStudent(studentRow),
                  cvProfile: toCvProfile(cvProfileRow),
                }),
            );
          }),
        updateCompany: ({ companyId, name, email, password, logoUrl, zoneCode, roomCode }) =>
          Effect.promise(async () => {
            const authContext = await auth.$context;
            const companyRows = await db
              .select()
              .from(company)
              .where(eq(company.id, companyId))
              .limit(1);

            if (companyRows.length === 0) {
              throw new Error("Company not found");
            }

            const companyRow = companyRows[0];
            const ownerUserId = companyRow.ownerUserId;

            if (Option.isSome(name)) {
              await db
                .update(company)
                .set({ name: name.value, updatedAt: new Date() })
                .where(eq(company.id, companyId));
              await db
                .update(user)
                .set({ name: name.value, updatedAt: new Date() })
                .where(eq(user.id, ownerUserId));
            }

            if (Option.isSome(email)) {
              const normalizedEmail = email.value.toLowerCase();
              const existingUser = await authContext.internalAdapter.findUserByEmail(normalizedEmail);
              if (existingUser && existingUser.user.id !== ownerUserId) {
                throw new Error("A user already exists for this email.");
              }
              await db
                .update(user)
                .set({ email: normalizedEmail, updatedAt: new Date() })
                .where(eq(user.id, ownerUserId));
              const accountRows = await db
                .select()
                .from(account)
                .where(eq(account.userId, ownerUserId))
                .limit(1);
              if (accountRows.length > 0) {
                await db
                  .update(account)
                  .set({ accountId: normalizedEmail, updatedAt: new Date() })
                  .where(eq(account.userId, ownerUserId));
              }
            }

            if (Option.isSome(password)) {
              const passwordHash = await authContext.password.hash(password.value);
              await db
                .update(account)
                .set({ password: passwordHash, updatedAt: new Date() })
                .where(eq(account.userId, ownerUserId));
            }

            const nextZoneCode = Option.isSome(zoneCode)
              ? normalizeOptionalText(zoneCode.value)
              : undefined;
            const nextRoomCode = Option.isSome(roomCode)
              ? normalizeOptionalText(roomCode.value)
              : undefined;
            const nextLogoUrl = Option.isSome(logoUrl)
              ? normalizeOptionalText(logoUrl.value)
              : undefined;

            const ensuredZone = nextZoneCode === undefined ? undefined : await ensureZoneByCode(nextZoneCode);
            const ensuredRoom = nextRoomCode === undefined
              ? undefined
              : await ensureRoomByCode(nextRoomCode, ensuredZone?.id ?? null);

            const companyUpdate: Partial<typeof company.$inferInsert> = {
              updatedAt: new Date(),
            };

            if (Option.isSome(name)) {
              companyUpdate.name = name.value;
            }

            if (nextLogoUrl !== undefined) {
              companyUpdate.logoUrl = nextLogoUrl;
            }

            if (ensuredZone !== undefined || ensuredRoom !== undefined) {
              companyUpdate.zoneId = ensuredZone?.id ?? ensuredRoom?.zoneId ?? null;
              companyUpdate.roomId = ensuredRoom?.id ?? null;
            }

            await db.update(company).set(companyUpdate).where(eq(company.id, companyId));

            const updatedEntry = await Effect.runPromise(loadCompanyLedgerEntryByCompanyId(companyId));

            if (!updatedEntry) {
              throw new Error("Company not found after update");
            }

            return updatedEntry;
          }),
        deleteCompany: ({ companyId }) =>
          Effect.promise(async () => {
            const companyRows = await db
              .select()
              .from(company)
              .where(eq(company.id, companyId))
              .limit(1);

            if (companyRows.length === 0) {
              throw new Error("Company not found");
            }

            const ownerUserId = companyRows[0].ownerUserId;
            await db.delete(user).where(eq(user.id, ownerUserId));
            return true;
          }),
        createZone: ({ code, label, latitude, longitude }) =>
          Effect.promise(async () => {
            const inserted = await db
              .insert(zone)
              .values({
                id: crypto.randomUUID(),
                code: normalizeCode(code),
                label: label.trim(),
                latitude: latitude ?? null,
                longitude: longitude ?? null,
              })
              .onConflictDoUpdate({
                target: zone.code,
                set: {
                  label: label.trim(),
                  latitude: latitude ?? null,
                  longitude: longitude ?? null,
                  updatedAt: new Date(),
                },
              })
              .returning();

            const savedZone = inserted[0];

            if (!savedZone) {
              throw new Error("Zone creation failed");
            }

            return toZone(savedZone)!;
          }),
        updateZone: ({ zoneId, code, label, latitude, longitude }) =>
          Effect.promise(async () => {
            const updated = await db
              .update(zone)
              .set({
                code: normalizeCode(code),
                label: label.trim(),
                latitude: latitude ?? null,
                longitude: longitude ?? null,
                updatedAt: new Date(),
              })
              .where(eq(zone.id, zoneId))
              .returning();

            const savedZone = updated[0];

            return savedZone ? toZone(savedZone)! : null;
          }),
        deleteZone: ({ zoneId }) =>
          Effect.promise(async () => {
            const deleted = await db
              .delete(zone)
              .where(eq(zone.id, zoneId))
              .returning({ id: zone.id });

            return deleted.length > 0;
          }),
        importCompaniesCsv: ({ csvContents }) =>
          Effect.promise(async () => {
            const lines = csvContents
              .split(/\r?\n/)
              .map((line) => line.trim())
              .filter((line) => line.length > 0);

            if (lines.length < 2) {
              throw new Error("CSV must include a header row and at least one company row.");
            }

            const headers = parseCsvLine(lines[0]).map((header) => header.trim().toLowerCase());
            const requiredHeaders = [
              "company_name",
              "email",
              "password",
              "logo_url",
              "zone",
              "salle",
            ];

            for (const requiredHeader of requiredHeaders) {
              if (!headers.includes(requiredHeader)) {
                throw new Error(`Missing CSV header: ${requiredHeader}`);
              }
            }

            let createdCount = 0;

            for (const line of lines.slice(1)) {
              const values = parseCsvLine(line);
              const row = Object.fromEntries(headers.map((header, index) => [header, values[index] ?? ""]));

              await createCompanyAccountRecord({
                companyName: row.company_name,
                email: row.email,
                password: row.password,
                logoUrl: row.logo_url,
                zoneCode: row.zone,
                roomCode: row.salle,
              });
              createdCount += 1;
            }

            return createdCount;
          }),
      });
    }),
  );
}
