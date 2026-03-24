import { describe, expect, it } from "vitest";
import {
  CompanyCompletedInterviewLedgerEntry,
  CompanyInterviewTag,
  CvProfile,
  CvProfileType,
  GlobalInterviewTag,
  Interview,
  PresentedCvProfilePreview,
  Student,
} from "@project/domain";

import {
  buildAggregatedInterviewTagOptions,
  canCompleteInterviewDraft,
  collectSuggestedCompanyTagLabels,
  describeInterviewNotes,
  filterAggregatedInterviewTagOptions,
  normalizeCustomTagLabel,
  normalizeInterviewScoreInput,
  partitionAggregatedInterviewTags,
  toggleAggregatedTagSelection,
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

const preview = new PresentedCvProfilePreview({
  student: new Student({
    id: asId<Student["id"]>("student-1"),
    firstName: "Ada",
    lastName: "Lovelace",
    phoneNumber: "+213 555 12 34",
    academicYear: "5th year",
    major: "Computer Science",
    institution: "ESI",
    image: null,
  }),
  cvProfile: new CvProfile({
    id: asId<CvProfile["id"]>("cv-1"),
    studentId: asId<CvProfile["studentId"]>("student-1"),
    presentationCode: "ABC123",
    profileType: new CvProfileType({
      id: asId<CvProfileType["id"]>("type-1"),
      label: "General CV",
    }),
    fileName: "ada.pdf",
    contentType: "application/pdf",
    fileSizeBytes: 2048,
  }),
  qrIdentity: "ABC123",
});

const draft: CompanyInterviewDraft = {
  interviewId: asId<Interview["id"]>("interview-1"),
  preview,
  recruiter: {
    id: asId<CompanyInterviewDraft["recruiter"]["id"]>("recruiter-1"),
    name: "Nora Lane",
  },
};

describe("company-interview-execution", () => {
  it("normalizes decimal interview score input within the valid range", () => {
    expect(normalizeInterviewScoreInput("4.3")).toBe(4.3);
    expect(normalizeInterviewScoreInput(" 5 ")).toBe(5);
    expect(normalizeInterviewScoreInput("0.8")).toBeNull();
    expect(normalizeInterviewScoreInput("5.2")).toBeNull();
    expect(normalizeInterviewScoreInput("")).toBeNull();
  });

  it("normalizes custom tag labels and ignores blanks", () => {
    expect(normalizeCustomTagLabel("  Follow Up  ")).toBe("Follow Up");
    expect(normalizeCustomTagLabel(" \n\t ")).toBeNull();
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
          student: preview.student,
          cvProfile: preview.cvProfile,
        }),
        new CompanyCompletedInterviewLedgerEntry({
          interview: makeInterview({
            id: "completed-2",
            companyTags: ["Backend Ready", "Strong Communication"],
          }),
          student: preview.student,
          cvProfile: preview.cvProfile,
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

  it("builds and filters one aggregated tag option list", () => {
    const options = buildAggregatedInterviewTagOptions({
      globalTags: [
        new GlobalInterviewTag({
          id: asId<GlobalInterviewTag["id"]>("g-1"),
          label: "Curious",
        }),
      ],
      companyTagSuggestions: ["Backend Ready", "curious"],
    });

    expect(options).toEqual([
      {
        globalTagId: "g-1",
        key: "curious",
        kind: "global",
        label: "Curious",
      },
      {
        key: "backend ready",
        kind: "company",
        label: "Backend Ready",
      },
    ]);

    expect(filterAggregatedInterviewTagOptions(options, "back")).toEqual([
      {
        key: "backend ready",
        kind: "company",
        label: "Backend Ready",
      },
    ]);
  });

  it("toggles selected labels and partitions them back into rpc payloads", () => {
    const options = buildAggregatedInterviewTagOptions({
      globalTags: [
        new GlobalInterviewTag({
          id: asId<GlobalInterviewTag["id"]>("g-1"),
          label: "Curious",
        }),
      ],
      companyTagSuggestions: ["Backend Ready"],
    });
    const selected = toggleAggregatedTagSelection(["Curious"], "Backend Ready");

    expect(toggleAggregatedTagSelection(selected, "curious")).toEqual(["Backend Ready"]);
    expect(
      partitionAggregatedInterviewTags({
        options,
        selectedLabels: selected,
      }),
    ).toEqual({
      globalTagIds: ["g-1"],
      companyTagLabels: ["Backend Ready"],
    });
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
