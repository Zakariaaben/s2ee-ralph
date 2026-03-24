import type { PresentedCvProfilePreview, Recruiter } from "@project/domain";

export type { CompanyInterviewDraft } from "./company-interview-execution";

export const companyPreferredRecruiterStorageKey =
  "company-workspace:preferred-recruiter-id";

export const normalizeStudentQrIdentityInput = (value: string): string =>
  value.trim();

export const resolvePreferredRecruiter = (
  recruiters: ReadonlyArray<Recruiter>,
  preferredRecruiterId: Recruiter["id"] | null,
): Recruiter | null => {
  if (preferredRecruiterId == null) {
    return null;
  }

  return recruiters.find((recruiter) => recruiter.id === preferredRecruiterId) ?? null;
};

export const resolveInterviewStartRecruiterId = (input: {
  readonly recruiters: ReadonlyArray<Recruiter>;
  readonly preferredRecruiterId: Recruiter["id"] | null;
  readonly selectedRecruiterId: Recruiter["id"] | null;
}): Recruiter["id"] | null => {
  if (
    input.selectedRecruiterId != null &&
    input.recruiters.some((recruiter) => recruiter.id === input.selectedRecruiterId)
  ) {
    return input.selectedRecruiterId;
  }

  return resolvePreferredRecruiter(input.recruiters, input.preferredRecruiterId)?.id ?? null;
};

export const canConfirmInterviewStart = (input: {
  readonly preview: PresentedCvProfilePreview | null;
  readonly selectedRecruiterId: Recruiter["id"] | null;
}): boolean =>
  input.preview != null && input.selectedRecruiterId != null;

export const summarizeInterviewStartChecklist = (input: {
  readonly preview: PresentedCvProfilePreview | null;
  readonly selectedRecruiterId: Recruiter["id"] | null;
}): ReadonlyArray<{
  readonly label: string;
  readonly done: boolean;
}> => [
  {
    label: "Candidate preview resolved",
    done: input.preview != null,
  },
  {
    label: "Recruiter selected",
    done: input.selectedRecruiterId != null,
  },
];
