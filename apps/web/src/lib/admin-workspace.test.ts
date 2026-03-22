import {
  AdminAccessLedgerEntry,
  AdminCompanyLedgerEntry,
  AdminInterviewLedgerCompany,
  AdminInterviewLedgerEntry,
  Company,
  CvProfile,
  CvProfileType,
  Interview,
  Recruiter,
  Room,
  Student,
  User,
} from "@project/domain";
import { DateTime } from "effect";
import { describe, expect, it } from "vitest";

import {
  describeAdminAccessSubject,
  describeAdminPlacement,
  filterAdminAccessLedger,
  filterAdminCompanyLedger,
  filterAdminInterviewLedger,
  selectRecentAdminInterviews,
  summarizeAdminWorkspace,
} from "@/lib/admin-workspace";

const makeRecruiter = (input: { readonly id: string; readonly name: string }) =>
  new Recruiter({
    id: input.id as Recruiter["id"],
    name: input.name,
  });

const makeCompany = (input: {
  readonly id: string;
  readonly name: string;
  readonly recruiters?: ReadonlyArray<Recruiter>;
}) =>
  new Company({
    id: input.id as Company["id"],
    name: input.name,
    recruiters: [...(input.recruiters ?? [])],
  });

const makeRoom = (input: { readonly id: string; readonly code: string }) =>
  new Room({
    id: input.id as Room["id"],
    code: input.code,
  });

const makeUser = (input: {
  readonly id: string;
  readonly name: string;
  readonly email: string;
  readonly role: User["role"];
}) =>
  new User({
    id: input.id as User["id"],
    name: input.name,
    email: input.email,
    role: input.role,
    emailVerified: true,
    image: null,
    createdAt: DateTime.make("2026-03-22T12:00:00.000Z")!,
    updatedAt: DateTime.make("2026-03-22T12:00:00.000Z")!,
  });

const makeStudent = (input: {
  readonly id: string;
  readonly firstName: string;
  readonly lastName: string;
  readonly course: string;
}) =>
  new Student({
    id: input.id as Student["id"],
    firstName: input.firstName,
    lastName: input.lastName,
    course: input.course,
  });

const makeCompanyLedgerEntry = (input: {
  readonly company: Company;
  readonly room: Room | null;
  readonly standNumber: number | null;
  readonly arrivalStatus: "arrived" | "not-arrived";
}) =>
  new AdminCompanyLedgerEntry({
    company: input.company,
    room: input.room,
    standNumber: input.standNumber,
    arrivalStatus: input.arrivalStatus,
  });

const softwareCvType = new CvProfileType({
  id: "software-engineering" as CvProfileType["id"],
  label: "Software Engineering",
});

const makeInterviewLedgerEntry = (input: {
  readonly id: string;
  readonly company: { readonly id: string; readonly name: string; readonly room: Room | null };
  readonly student: Student;
  readonly status: "completed" | "cancelled";
  readonly recruiterName: string;
  readonly score: number | null;
}) =>
  new AdminInterviewLedgerEntry({
    interview: new Interview({
      id: input.id as Interview["id"],
      companyId: input.company.id as Interview["companyId"],
      studentId: input.student.id,
      cvProfileId: `cv_${input.id}` as Interview["cvProfileId"],
      recruiterName: input.recruiterName,
      status: input.status,
      score: input.score,
      globalTags: [],
      companyTags: [],
    }),
    company: new AdminInterviewLedgerCompany({
      id: input.company.id as AdminInterviewLedgerCompany["id"],
      name: input.company.name,
      room: input.company.room,
      standNumber: input.company.room == null ? null : 9,
      arrivalStatus: "not-arrived",
    }),
    student: input.student,
    cvProfile: new CvProfile({
      id: `cv_${input.id}` as CvProfile["id"],
      studentId: input.student.id,
      profileType: softwareCvType,
      fileName: `${input.student.firstName.toLowerCase()}-cv.pdf`,
      contentType: "application/pdf",
      fileSizeBytes: 12_000,
    }),
  });

const makeAccessLedgerEntry = (input: {
  readonly user: User;
  readonly student?: Student | null;
  readonly company?: Company | null;
}) =>
  new AdminAccessLedgerEntry({
    user: input.user,
    student: input.student ?? null,
    company: input.company ?? null,
  });

describe("admin workspace helper", () => {
  const atlas = makeCompany({
    id: "company_1",
    name: "Atlas Systems",
    recruiters: [makeRecruiter({ id: "recruiter_1", name: "Nora Recruiter" })],
  });
  const beacon = makeCompany({
    id: "company_2",
    name: "Beacon Labs",
    recruiters: [makeRecruiter({ id: "recruiter_2", name: "Iris Recruiter" })],
  });
  const roomA = makeRoom({ id: "room_a", code: "A1" });
  const ada = makeStudent({
    id: "student_1",
    firstName: "Ada",
    lastName: "Lovelace",
    course: "Computer Science",
  });
  const grace = makeStudent({
    id: "student_2",
    firstName: "Grace",
    lastName: "Hopper",
    course: "Software Engineering",
  });

  const companyLedger = [
    makeCompanyLedgerEntry({
      company: atlas,
      room: roomA,
      standNumber: 12,
      arrivalStatus: "not-arrived",
    }),
    makeCompanyLedgerEntry({
      company: beacon,
      room: null,
      standNumber: null,
      arrivalStatus: "not-arrived",
    }),
  ];

  const interviewLedger = [
    makeInterviewLedgerEntry({
      id: "interview_1",
      company: { id: atlas.id, name: atlas.name, room: roomA },
      student: ada,
      status: "completed",
      recruiterName: "Nora Recruiter",
      score: 4.5,
    }),
    makeInterviewLedgerEntry({
      id: "interview_2",
      company: { id: beacon.id, name: beacon.name, room: null },
      student: grace,
      status: "cancelled",
      recruiterName: "Iris Recruiter",
      score: null,
    }),
  ];

  const accessLedger = [
    makeAccessLedgerEntry({
      user: makeUser({
        id: "user_1",
        name: "Admin Ops",
        email: "admin@example.com",
        role: "admin",
      }),
    }),
    makeAccessLedgerEntry({
      user: makeUser({
        id: "user_2",
        name: "Ada Student",
        email: "ada@example.com",
        role: "student",
      }),
      student: ada,
    }),
    makeAccessLedgerEntry({
      user: makeUser({
        id: "user_3",
        name: "Atlas Owner",
        email: "atlas@example.com",
        role: "company",
      }),
      company: atlas,
    }),
  ];

  it("summarizes operational monitoring counts and next attention area", () => {
    const summary = summarizeAdminWorkspace({
      companyLedger,
      interviewLedger,
      accessLedger,
    });

    expect(summary.companyCount).toBe(2);
    expect(summary.placedCompanyCount).toBe(1);
    expect(summary.unplacedCompanyCount).toBe(1);
    expect(summary.pendingArrivalCount).toBe(1);
    expect(summary.completedInterviewCount).toBe(1);
    expect(summary.cancelledInterviewCount).toBe(1);
    expect(summary.adminCount).toBe(1);
    expect(summary.studentCount).toBe(1);
    expect(summary.companyAccountCount).toBe(1);
    expect(summary.nextOperationalLabel).toBe("1 company still needs a room placement.");
  });

  it("filters company oversight entries by placement, arrival state, and search fields", () => {
    expect(
      filterAdminCompanyLedger(companyLedger, {
        query: "atlas",
        arrival: "all",
        placement: "all",
      }).map((entry) => entry.company.name),
    ).toEqual(["Atlas Systems"]);

    expect(
      filterAdminCompanyLedger(companyLedger, {
        query: "",
        arrival: "pending",
        placement: "placed",
      }).map((entry) => entry.company.name),
    ).toEqual(["Atlas Systems"]);

    expect(
      filterAdminCompanyLedger(companyLedger, {
        query: "iris",
        arrival: "all",
        placement: "all",
      }).map((entry) => entry.company.name),
    ).toEqual(["Beacon Labs"]);
  });

  it("filters access and interview ledgers with role and status context", () => {
    expect(
      filterAdminAccessLedger(accessLedger, {
        query: "atlas",
        role: "all",
      }).map((entry) => entry.user.email),
    ).toEqual(["atlas@example.com"]);

    expect(
      filterAdminAccessLedger(accessLedger, {
        query: "",
        role: "student",
      }).map((entry) => entry.user.email),
    ).toEqual(["ada@example.com"]);

    expect(
      filterAdminInterviewLedger(interviewLedger, {
        query: "grace",
        status: "cancelled",
      }).map((entry) => entry.interview.id),
    ).toEqual(["interview_2"]);
  });

  it("formats oversight labels for linked subjects, placement, and recent previews", () => {
    expect(describeAdminAccessSubject(accessLedger[2]!)).toBe("Atlas Systems");
    expect(describeAdminAccessSubject(accessLedger[1]!)).toBe("Ada Lovelace");
    expect(describeAdminPlacement(companyLedger[0]!)).toBe("Room A1 / Stand 12");
    expect(describeAdminPlacement(companyLedger[1]!)).toBe("Unplaced");
    expect(selectRecentAdminInterviews(interviewLedger, 1).map((entry) => entry.interview.id)).toEqual([
      "interview_2",
    ]);
  });
});
