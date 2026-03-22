import { describe, expect, it } from "vitest";
import {
  Company,
  CompanyCompletedInterviewLedgerEntry,
  CompanyInterviewTag,
  CvProfile,
  GlobalInterviewTag,
  Interview,
  Student,
} from "@project/domain";

import {
  companyCompletedPreviewLimit,
  selectRecentCompletedInterviews,
  summarizeCompanyWorkspace,
} from "./company-workspace";

const asId = <Value extends string>(value: string): Value => value as Value;

const makeInterview = (input: {
  readonly id: string;
  readonly score: number | null;
  readonly globalTagIds?: ReadonlyArray<string>;
  readonly companyTagIds?: ReadonlyArray<string>;
}) =>
  new Interview({
    id: asId<Interview["id"]>(input.id),
    companyId: asId<Interview["companyId"]>("company-1"),
    studentId: asId<Interview["studentId"]>(`student-${input.id}`),
    cvProfileId: asId<Interview["cvProfileId"]>(`cv-${input.id}`),
    recruiterName: "Nora Lane",
    status: input.score == null ? "cancelled" : "completed",
    score: input.score,
    notes: "",
    globalTags: (input.globalTagIds ?? []).map(
      (tagId) =>
        new GlobalInterviewTag({
          id: asId<GlobalInterviewTag["id"]>(tagId),
          label: `Global ${tagId}`,
        }),
    ),
    companyTags: (input.companyTagIds ?? []).map(
      (tagId) =>
        new CompanyInterviewTag({
          id: asId<CompanyInterviewTag["id"]>(tagId),
          label: `Company ${tagId}`,
        }),
    ),
  });

const makeCompletedEntry = (id: string, score: number) =>
  new CompanyCompletedInterviewLedgerEntry({
    interview: makeInterview({
      id,
      score,
      globalTagIds: ["global-fit"],
      companyTagIds: ["company-signal"],
    }),
    student: new Student({
      id: asId<Student["id"]>(`student-${id}`),
      firstName: "Ada",
      lastName: `Student ${id}`,
      course: "Software engineering",
    }),
    cvProfile: new CvProfile({
      id: asId<CvProfile["id"]>(`cv-${id}`),
      studentId: asId<CvProfile["studentId"]>(`student-${id}`),
      profileType: {
        id: asId<CvProfile["profileType"]["id"]>("cv-type"),
        label: "General CV",
      },
      fileName: `${id}.pdf`,
      contentType: "application/pdf",
      fileSizeBytes: 2048,
    }),
  });

describe("company-workspace", () => {
  it("summarizes recruiter, interview, score, and tag metrics", () => {
    const company = new Company({
      id: asId<Company["id"]>("company-1"),
      name: "North Ridge Labs",
      recruiters: [
        { id: asId<Company["recruiters"][number]["id"]>("recruiter-1"), name: "Nora Lane" },
        { id: asId<Company["recruiters"][number]["id"]>("recruiter-2"), name: "Ilyes Haddad" },
      ],
    });

    const summary = summarizeCompanyWorkspace({
      company,
      activeInterviews: [
        makeInterview({
          id: "active-1",
          score: null,
          globalTagIds: ["global-fit"],
          companyTagIds: ["company-react"],
        }),
      ],
      completedInterviews: [
        makeCompletedEntry("completed-1", 4),
        makeCompletedEntry("completed-2", 2),
      ],
    });

    expect(summary).toEqual({
      recruiterCount: 2,
      activeInterviewCount: 1,
      completedInterviewCount: 2,
      averageCompletedScore: 3,
      distinctTagCount: 3,
    });
  });

  it("keeps the most recent completed interviews from oldest-first input", () => {
    const entries = Array.from({ length: companyCompletedPreviewLimit + 2 }, (_, index) =>
      makeCompletedEntry(`completed-${index + 1}`, index + 1),
    );

    expect(selectRecentCompletedInterviews(entries).map((entry) => entry.interview.id)).toEqual([
      "completed-7",
      "completed-6",
      "completed-5",
      "completed-4",
      "completed-3",
    ]);
  });
});
