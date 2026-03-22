import type { CvProfile, Recruiter } from "@project/domain";

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

export const resolveInterviewStartCvProfileId = (
  cvProfiles: ReadonlyArray<CvProfile>,
  selectedCvProfileId: CvProfile["id"] | null,
): CvProfile["id"] | null => {
  if (selectedCvProfileId == null) {
    return null;
  }

  return cvProfiles.some((cvProfile) => cvProfile.id === selectedCvProfileId)
    ? selectedCvProfileId
    : null;
};

export const canConfirmInterviewStart = (input: {
  readonly hasResolvedStudent: boolean;
  readonly selectedRecruiterId: Recruiter["id"] | null;
  readonly selectedCvProfileId: CvProfile["id"] | null;
}): boolean =>
  input.hasResolvedStudent &&
  input.selectedRecruiterId != null &&
  input.selectedCvProfileId != null;

export const summarizeInterviewStartChecklist = (input: {
  readonly hasResolvedStudent: boolean;
  readonly selectedRecruiterId: Recruiter["id"] | null;
  readonly selectedCvProfileId: CvProfile["id"] | null;
}): ReadonlyArray<{
  readonly label: string;
  readonly done: boolean;
}> => [
  {
    label: "Student preview resolved",
    done: input.hasResolvedStudent,
  },
  {
    label: "Recruiter selected",
    done: input.selectedRecruiterId != null,
  },
  {
    label: "CV chosen",
    done: input.selectedCvProfileId != null,
  },
];
