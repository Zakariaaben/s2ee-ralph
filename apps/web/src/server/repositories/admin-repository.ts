import { DB } from "@project/db";
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
} from "@project/domain";
import { asc, eq, inArray } from "drizzle-orm";
import { Effect, Layer, ServiceMap } from "effect";

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
    course: studentRow.course,
  });

const toCvProfile = (cvProfileRow: typeof cvProfile.$inferSelect) =>
  new CvProfile({
    id: cvProfileRow.id as CvProfile["id"],
    studentId: cvProfileRow.studentId as CvProfile["studentId"],
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

      return AdminRepository.of({
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

            const recruiterRows = yield* Effect.promise(() =>
              db
                .select()
                .from(recruiter)
                .where(
                  inArray(
                    recruiter.companyId,
                    companyRows.map(({ companyRow }) => companyRow.id),
                  ),
                )
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
