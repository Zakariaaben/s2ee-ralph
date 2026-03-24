import type { CvProfile, Student } from "@project/domain";

export type StudentCvProfileGroup = {
  readonly profileTypeId: string;
  readonly profileTypeLabel: string;
  readonly profiles: ReadonlyArray<CvProfile>;
};

const hasText = (value: string | null | undefined): boolean =>
  typeof value === "string" && value.trim().length > 0;

export const hasStudentOnboardingProfile = (
  student: Student | null,
): boolean =>
  student != null &&
  hasText(student.firstName) &&
  hasText(student.lastName) &&
  hasText(student.phoneNumber) &&
  hasText(student.academicYear) &&
  hasText(student.major) &&
  hasText(student.institution);

export const groupStudentCvProfiles = (
  cvProfiles: ReadonlyArray<CvProfile>,
): ReadonlyArray<StudentCvProfileGroup> => {
  const groupedEntries = new Map<string, StudentCvProfileGroup>();

  for (const cvProfile of cvProfiles) {
    const existingGroup = groupedEntries.get(cvProfile.profileType.id);

    if (existingGroup == null) {
      groupedEntries.set(cvProfile.profileType.id, {
        profileTypeId: cvProfile.profileType.id,
        profileTypeLabel: cvProfile.profileType.label,
        profiles: [cvProfile],
      });
      continue;
    }

    groupedEntries.set(cvProfile.profileType.id, {
      ...existingGroup,
      profiles: [...existingGroup.profiles, cvProfile],
    });
  }

  return Array.from(groupedEntries.values())
    .map((group) => ({
      ...group,
      profiles: [...group.profiles].sort((left, right) => {
        const byFileName = left.fileName.localeCompare(right.fileName);
        if (byFileName !== 0) {
          return byFileName;
        }

        return left.id.localeCompare(right.id);
      }),
    }))
    .sort((left, right) => left.profileTypeLabel.localeCompare(right.profileTypeLabel));
};

export const findStudentCvProfileById = (
  cvProfiles: ReadonlyArray<CvProfile>,
  profileId: string,
): CvProfile | null =>
  cvProfiles.find((cvProfile) => cvProfile.id === profileId) ?? null;

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
