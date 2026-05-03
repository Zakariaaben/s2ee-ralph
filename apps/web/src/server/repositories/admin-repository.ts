import { makeAuth } from "@project/auth";
import { DB } from "@project/db";
import { user } from "@project/db/schema/auth";
import { company, recruiter } from "@project/db/schema/company";
import { cvProfile } from "@project/db/schema/cv-profile";
import {
  interview as interviewTable,
  interviewCompanyTag,
  interviewGlobalTag,
} from "@project/db/schema/interview";
import { student } from "@project/db/schema/student";
import { room } from "@project/db/schema/venue";
import {
  AdminAccessLedgerEntry,
  AdminCompanyLedgerEntry,
  AdminInterviewLedgerCompany,
  AdminInterviewLedgerEntry,
  Company,
  CompanyInterviewTag,
  CvProfile,
  CvProfileType,
  GlobalInterviewTag,
  Interview,
  Recruiter,
  Room,
  Student,
  User,
  encodeCvProfilePresentationCode,
  type UserRoleValue,
} from "@project/domain";
import { asc, eq, inArray } from "drizzle-orm";
import { DateTime, Effect, Layer, ServiceMap } from "effect";

const makeCompanyId = () => crypto.randomUUID();

const toRoom = (roomRow: typeof room.$inferSelect) =>
  new Room({
    id: roomRow.id as Room["id"],
    code: roomRow.code,
  });

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
    }) => Effect.Effect<AdminAccessLedgerEntry | null>;
    readonly createCompanyAccount: (input: {
      readonly companyName: string;
      readonly email: string;
      readonly password: string;
    }) => Effect.Effect<AdminAccessLedgerEntry, Error>;
    readonly listCompanyLedger: () => Effect.Effect<
      ReadonlyArray<AdminCompanyLedgerEntry>
    >;
    readonly listInterviewLedger: () => Effect.Effect<
      ReadonlyArray<AdminInterviewLedgerEntry>
    >;
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

      return AdminRepository.of({
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
              return null;
            }

            return yield* loadAccessEntryByUserId(userId);
          }),
        createCompanyAccount: ({ companyName, email, password }) =>
          Effect.promise(async () => {
            let createdUserId: string | null = null;

            try {
              const authContext = await auth.$context;
              const normalizedEmail = email.toLowerCase();

              if (await authContext.internalAdapter.findUserByEmail(normalizedEmail)) {
                throw new Error("A user already exists for this email.");
              }

              const passwordHash = await authContext.password.hash(password);
              const createdUser = await authContext.internalAdapter.createUser({
                email: normalizedEmail,
                emailVerified: true,
                image: null,
                name: companyName,
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

              await db.transaction(async (tx) => {
                await tx.insert(company).values({
                  id: makeCompanyId(),
                  ownerUserId: nextUserId,
                  name: companyName,
                });
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

              throw error instanceof Error
                ? error
                : new Error("Company account creation failed.");
            }
          }),
        listCompanyLedger: () =>
          Effect.gen(function*() {
            const companyRows = yield* Effect.promise(() =>
              db
                .select({
                  companyRow: company,
                  roomRow: room,
                })
                .from(company)
                .leftJoin(room, eq(company.roomId, room.id))
                .orderBy(asc(company.name), asc(company.id)),
            );

            if (companyRows.length === 0) {
              return [];
            }

            const recruitersByCompanyId = yield* getRecruitersByCompanyIds(
              companyRows.map(({ companyRow }) => companyRow.id),
            );

            return companyRows.map(
              ({ companyRow, roomRow }) =>
                new AdminCompanyLedgerEntry({
                  company: toCompany(
                    companyRow,
                    recruitersByCompanyId.get(companyRow.id) ?? [],
                  ),
                  room: roomRow ? toRoom(roomRow) : null,
                  standNumber: companyRow.standNumber,
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
                    room: roomRow ? toRoom(roomRow) : null,
                    standNumber: companyRow.standNumber,
                    arrivalStatus: companyRow.arrivalStatus,
                  }),
                  student: toStudent(studentRow),
                  cvProfile: toCvProfile(cvProfileRow),
                }),
            );
          }),
      });
    }),
  );
}
