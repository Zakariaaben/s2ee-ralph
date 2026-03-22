import { describe, expect, it } from "vitest";
import {
  CompanyCompletedInterviewLedgerEntry,
  CompanyInterviewTag,
  CvProfile,
  CvProfileType,
  Interview,
  Student,
} from "@project/domain";

import {
  canCompleteInterviewDraft,
  collectSuggestedCompanyTagLabels,
  describeInterviewNotes,
  normalizeCompanyTagLabels,
  toggleGlobalInterviewTagId,
  type CompanyInterviewDraft,
} from "./company-interview-execution";

const asId = <Value extends string>(value: string): Value => value as Value;

const makeInterview = (input: {
  readonly id: string;
  readonly companyTags?: ReadonlyArray<string>;
}) =>
  new Interview({
    id: asId<Interview["id"]>(input.id),
    companyId: asId<Interview["companyId"]>("company-1"),
    studentId: asId<Interview["studentId"]>("student-1"),
    cvProfileId: asId<Interview["cvProfileId"]>("cv-1"),
    recruiterName: "Nora Lane",
    status: "completed",
    score: 4,
    notes: "",
    globalTags: [],
    companyTags: (input.companyTags ?? []).map(
      (label, index) =>
        new CompanyInterviewTag({
          id: asId<CompanyInterviewTag["id"]>(`tag-${input.id}-${index}`),
          label,
        }),
    ),
  });

const draft: CompanyInterviewDraft = {
  student: new Student({
    id: asId<Student["id"]>("student-1"),
    firstName: "Ada",
    lastName: "Lovelace",
    course: "Computer Science",
  }),
  recruiter: {
    id: asId<CompanyInterviewDraft["recruiter"]["id"]>("recruiter-1"),
    name: "Nora Lane",
  },
  cvProfile: new CvProfile({
    id: asId<CvProfile["id"]>("cv-1"),
    studentId: asId<CvProfile["studentId"]>("student-1"),
    profileType: new CvProfileType({
      id: asId<CvProfileType["id"]>("type-1"),
      label: "General CV",
    }),
    fileName: "ada.pdf",
    contentType: "application/pdf",
    fileSizeBytes: 2048,
  }),
  qrIdentity: "student:v1:student-1",
};

describe("company-interview-execution", () => {
  it("normalizes freeform company tags from comma or newline input", () => {
    expect(
      normalizeCompanyTagLabels(" Backend Ready, backend ready\nFollow Up \n "),
    ).toEqual(["Backend Ready", "Follow Up"]);
  });

  it("collects unique company tag suggestions from newest interview history first", () => {
    const suggestions = collectSuggestedCompanyTagLabels({
      activeInterviews: [makeInterview({ id: "active", companyTags: ["Fast Track"] })],
      completedInterviews: [
        new CompanyCompletedInterviewLedgerEntry({
          interview: makeInterview({
            id: "completed-1",
            companyTags: ["Follow Up", "Backend Ready"],
          }),
          student: draft.student,
          cvProfile: draft.cvProfile,
        }),
        new CompanyCompletedInterviewLedgerEntry({
          interview: makeInterview({
            id: "completed-2",
            companyTags: ["Backend Ready", "Strong Communication"],
          }),
          student: draft.student,
          cvProfile: draft.cvProfile,
        }),
      ],
    });

    expect(suggestions).toEqual([
      "Backend Ready",
      "Strong Communication",
      "Follow Up",
      "Fast Track",
    ]);
  });

  it("toggles global tag selections without duplicating ids", () => {
    expect(
      toggleGlobalInterviewTagId(
        [asId<Parameters<typeof toggleGlobalInterviewTagId>[0][number]>("curious")],
        asId<Parameters<typeof toggleGlobalInterviewTagId>[0][number]>("curious"),
      ),
    ).toEqual([]);
    expect(
      toggleGlobalInterviewTagId(
        [asId<Parameters<typeof toggleGlobalInterviewTagId>[0][number]>("curious")],
        asId<Parameters<typeof toggleGlobalInterviewTagId>[0][number]>("clear-communicator"),
      ),
    ).toEqual(["curious", "clear-communicator"]);
  });

  it("requires both a staged draft and score before completion", () => {
    expect(canCompleteInterviewDraft({ draft, score: 4 })).toBe(true);
    expect(canCompleteInterviewDraft({ draft, score: null })).toBe(false);
    expect(canCompleteInterviewDraft({ draft: null, score: 4 })).toBe(false);
  });

  it("returns null when interview notes are effectively blank", () => {
    expect(describeInterviewNotes("  Strong follow-up potential. ")).toBe(
      "Strong follow-up potential.",
    );
    expect(describeInterviewNotes(" \n\t ")).toBeNull();
  });
});
