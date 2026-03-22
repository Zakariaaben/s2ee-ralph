import type { CvProfile, Student } from "@project/domain";

export type StudentWorkspaceSummary = {
  readonly completionPercent: number;
  readonly hasOnboardingProfile: boolean;
  readonly hasUploadedCv: boolean;
  readonly isEventReady: boolean;
  readonly qrIdentityAvailable: boolean;
  readonly nextStepLabel: string;
  readonly checklist: ReadonlyArray<{
    readonly description: string;
    readonly done: boolean;
    readonly id: "profile" | "cv" | "qr";
    readonly label: string;
  }>;
};

const hasText = (value: string | null | undefined): boolean =>
  typeof value === "string" && value.trim().length > 0;

export const hasStudentOnboardingProfile = (
  student: Student | null,
): boolean =>
  student != null &&
  hasText(student.firstName) &&
  hasText(student.lastName) &&
  hasText(student.course);

export const summarizeStudentWorkspace = (input: {
  readonly cvProfiles: ReadonlyArray<CvProfile>;
  readonly student: Student | null;
}): StudentWorkspaceSummary => {
  const hasOnboardingProfile = hasStudentOnboardingProfile(input.student);
  const hasUploadedCv = input.cvProfiles.length > 0;
  const qrIdentityAvailable = hasOnboardingProfile;
  const isEventReady = hasOnboardingProfile && hasUploadedCv;

  const checklist = [
    {
      id: "profile" as const,
      label: "Complete onboarding",
      description: "Add your event profile so recruiters see a usable student record.",
      done: hasOnboardingProfile,
    },
    {
      id: "cv" as const,
      label: "Upload at least one CV",
      description: "Keep one ready profile on hand before the event starts.",
      done: hasUploadedCv,
    },
    {
      id: "qr" as const,
      label: "Unlock your QR identity",
      description: "Your QR code becomes available once onboarding is complete.",
      done: qrIdentityAvailable,
    },
  ];

  const completedSteps = checklist.filter((item) => item.done).length;
  const completionPercent = Math.round((completedSteps / checklist.length) * 100);

  const nextStepLabel = !hasOnboardingProfile
    ? "Finish your onboarding profile."
    : !hasUploadedCv
      ? "Upload your first CV profile."
      : "You are event-ready.";

  return {
    completionPercent,
    hasOnboardingProfile,
    hasUploadedCv,
    isEventReady,
    qrIdentityAvailable,
    nextStepLabel,
    checklist,
  };
};

export const formatStudentDisplayName = (student: Student | null): string =>
  student == null ? "New student" : `${student.firstName} ${student.lastName}`.trim();

export const formatFileSize = (fileSizeBytes: number): string => {
  if (fileSizeBytes < 1024) {
    return `${fileSizeBytes} B`;
  }

  if (fileSizeBytes < 1024 * 1024) {
    return `${(fileSizeBytes / 1024).toFixed(1)} KB`;
  }

  return `${(fileSizeBytes / (1024 * 1024)).toFixed(1)} MB`;
};
