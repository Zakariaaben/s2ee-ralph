import { describe, expect, it } from "vitest";
import { CvProfile, CvProfileType, Recruiter } from "@project/domain";

import {
  canConfirmInterviewStart,
  normalizeStudentQrIdentityInput,
  resolveInterviewStartCvProfileId,
  resolveInterviewStartRecruiterId,
  resolvePreferredRecruiter,
  summarizeInterviewStartChecklist,
} from "./company-interview-start";

const asId = <Value extends string>(value: string): Value => value as Value;

const recruiters = [
  new Recruiter({
    id: asId<Recruiter["id"]>("recruiter-1"),
    name: "Nora Lane",
  }),
  new Recruiter({
    id: asId<Recruiter["id"]>("recruiter-2"),
    name: "Ilyes Haddad",
  }),
];

const cvProfiles = [
  new CvProfile({
    id: asId<CvProfile["id"]>("cv-1"),
    studentId: asId<CvProfile["studentId"]>("student-1"),
    profileType: new CvProfileType({
      id: asId<CvProfileType["id"]>("type-1"),
      label: "General CV",
    }),
    fileName: "general.pdf",
    contentType: "application/pdf",
    fileSizeBytes: 1024,
  }),
];

describe("company-interview-start", () => {
  it("normalizes scanner or pasted QR input", () => {
    expect(normalizeStudentQrIdentityInput("  student:v1:student-1 \n")).toBe(
      "student:v1:student-1",
    );
  });

  it("reuses a remembered recruiter only when it still belongs to the company", () => {
    expect(
      resolvePreferredRecruiter(
        recruiters,
        asId<Recruiter["id"]>("recruiter-2"),
      )?.name,
    ).toBe("Ilyes Haddad");

    expect(
      resolvePreferredRecruiter(
        recruiters,
        asId<Recruiter["id"]>("missing-recruiter"),
      ),
    ).toBeNull();
  });

  it("falls back to the remembered recruiter when no explicit recruiter is selected", () => {
    expect(
      resolveInterviewStartRecruiterId({
        recruiters,
        preferredRecruiterId: asId<Recruiter["id"]>("recruiter-1"),
        selectedRecruiterId: null,
      }),
    ).toBe("recruiter-1");

    expect(
      resolveInterviewStartRecruiterId({
        recruiters,
        preferredRecruiterId: asId<Recruiter["id"]>("missing-recruiter"),
        selectedRecruiterId: null,
      }),
    ).toBeNull();
  });

  it("drops stale CV selections when the resolved student changes", () => {
    expect(resolveInterviewStartCvProfileId(cvProfiles, asId<CvProfile["id"]>("cv-1"))).toBe(
      "cv-1",
    );
    expect(
      resolveInterviewStartCvProfileId(cvProfiles, asId<CvProfile["id"]>("cv-missing")),
    ).toBeNull();
  });

  it("requires preview, recruiter, and CV before confirming the interview start", () => {
    expect(
      canConfirmInterviewStart({
        hasResolvedStudent: true,
        selectedRecruiterId: asId<Recruiter["id"]>("recruiter-1"),
        selectedCvProfileId: asId<CvProfile["id"]>("cv-1"),
      }),
    ).toBe(true);

    expect(
      canConfirmInterviewStart({
        hasResolvedStudent: true,
        selectedRecruiterId: asId<Recruiter["id"]>("recruiter-1"),
        selectedCvProfileId: null,
      }),
    ).toBe(false);
  });

  it("summarizes the interview-start checklist for the UI", () => {
    expect(
      summarizeInterviewStartChecklist({
        hasResolvedStudent: true,
        selectedRecruiterId: asId<Recruiter["id"]>("recruiter-2"),
        selectedCvProfileId: null,
      }),
    ).toEqual([
      { label: "Student preview resolved", done: true },
      { label: "Recruiter selected", done: true },
      { label: "CV chosen", done: false },
    ]);
  });
});
