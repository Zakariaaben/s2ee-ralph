import { describe, expect, it } from "vitest";
import {
  CompanyCompletedInterviewLedgerEntry,
  CvProfile,
  CvProfileType,
  Interview,
  Student,
} from "@project/domain";

import {
  buildCompanyInterviewListRows,
  filterCompanyInterviewListRows,
} from "./company-interviews";

const asId = <Value extends string>(value: string): Value => value as Value;

const activeInterview = new Interview({
  id: asId<Interview["id"]>("active-1"),
  companyId: asId<Interview["companyId"]>("company-1"),
  studentId: asId<Interview["studentId"]>("student-1"),
  cvProfileId: asId<Interview["cvProfileId"]>("cv-1"),
  recruiterName: "Nora Lane",
  status: "active",
  score: null,
  notes: "",
  globalTags: [],
  companyTags: [],
});

const completedInterview = new CompanyCompletedInterviewLedgerEntry({
  interview: new Interview({
    id: asId<Interview["id"]>("completed-1"),
    companyId: asId<Interview["companyId"]>("company-1"),
    studentId: asId<Interview["studentId"]>("student-2"),
    cvProfileId: asId<Interview["cvProfileId"]>("cv-2"),
    recruiterName: "Ilyes Haddad",
    status: "completed",
    score: 4.4,
    notes: "",
    globalTags: [],
    companyTags: [],
  }),
  student: new Student({
    id: asId<Student["id"]>("student-2"),
    firstName: "Ada",
    lastName: "Lovelace",
    phoneNumber: "+213 555 12 34",
    academicYear: "5th year",
    major: "Computer Science",
    institution: "ESI",
    image: null,
  }),
  cvProfile: new CvProfile({
    id: asId<CvProfile["id"]>("cv-2"),
    studentId: asId<CvProfile["studentId"]>("student-2"),
    presentationCode: "ABC123",
    profileType: new CvProfileType({
      id: asId<CvProfileType["id"]>("type-1"),
      label: "General CV",
    }),
    fileName: "ada.pdf",
    contentType: "application/pdf",
    fileSizeBytes: 1024,
  }),
});

describe("company-interviews", () => {
  it("builds rows for both active and completed interviews", () => {
    expect(
      buildCompanyInterviewListRows({
        activeInterviews: [activeInterview],
        completedInterviews: [completedInterview],
      }),
    ).toEqual([
      {
        id: "active-1",
        institution: "",
        kind: "active",
        label: "Interview active-1",
        major: "",
        recruiterName: "Nora Lane",
        scoreLabel: "In progress",
        status: "active",
      },
      {
        id: "completed-1",
        institution: "ESI",
        kind: "completed",
        label: "Ada Lovelace",
        major: "Computer Science",
        recruiterName: "Ilyes Haddad",
        scoreLabel: "4.4 / 5",
        status: "completed",
      },
    ]);
  });

  it("filters rows by status and search query", () => {
    const rows = buildCompanyInterviewListRows({
      activeInterviews: [activeInterview],
      completedInterviews: [completedInterview],
    });

    expect(
      filterCompanyInterviewListRows(rows, {
        query: "ada",
        status: "all",
      }).map((row) => row.id),
    ).toEqual(["completed-1"]);

    expect(
      filterCompanyInterviewListRows(rows, {
        query: "",
        status: "active",
      }).map((row) => row.id),
    ).toEqual(["active-1"]);
  });
});
