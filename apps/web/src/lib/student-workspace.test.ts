import { CvProfile, CvProfileType, Student } from "@project/domain";
import { describe, expect, it } from "vitest";

import {
  findStudentCvProfileById,
  formatFileSize,
  formatStudentDisplayName,
  groupStudentCvProfiles,
  hasStudentOnboardingProfile,
} from "@/lib/student-workspace";

const softwareCvType = new CvProfileType({
  id: "software-engineering" as CvProfileType["id"],
  label: "Software Engineering",
});

const dataCvType = new CvProfileType({
  id: "data-science" as CvProfileType["id"],
  label: "Data Science",
});

const makeStudent = (overrides: Partial<Student> = {}) =>
  new Student({
    id: "student_1" as Student["id"],
    firstName: "Ada",
    lastName: "Lovelace",
    phoneNumber: "+213 555 12 34",
    academicYear: "5th year",
    major: "Computer Science",
    institution: "ESI",
    image: null,
    ...overrides,
  });

const makeCvProfile = (input: {
  readonly contentType?: string;
  readonly fileName: string;
  readonly id: string;
  readonly profileType: CvProfileType;
}) =>
  new CvProfile({
    id: input.id as CvProfile["id"],
    studentId: "student_1" as Student["id"],
    presentationCode: `profile:v1:${input.id}`,
    profileType: input.profileType,
    fileName: input.fileName,
    contentType: input.contentType ?? "application/pdf",
    fileSizeBytes: 150_000,
  });

describe("student workspace helpers", () => {
  it("requires all onboarding fields to be non-empty", () => {
    expect(hasStudentOnboardingProfile(null)).toBe(false);

    const incompleteStudent = makeStudent({
      major: " ",
    });
    expect(hasStudentOnboardingProfile(incompleteStudent)).toBe(false);

    expect(hasStudentOnboardingProfile(makeStudent())).toBe(true);
  });

  it("groups cv profiles by profile type and sorts groups and entries", () => {
    const groupedProfiles = groupStudentCvProfiles([
      makeCvProfile({
        id: "cv-3",
        fileName: "zeta.pdf",
        profileType: softwareCvType,
      }),
      makeCvProfile({
        id: "cv-2",
        fileName: "alpha.pdf",
        profileType: softwareCvType,
      }),
      makeCvProfile({
        id: "cv-1",
        fileName: "beta.pdf",
        profileType: dataCvType,
      }),
    ]);

    expect(groupedProfiles).toHaveLength(2);
    expect(groupedProfiles[0]?.profileTypeLabel).toBe("Data Science");
    expect(groupedProfiles[1]?.profileTypeLabel).toBe("Software Engineering");
    expect(groupedProfiles[1]?.profiles.map((profile) => profile.fileName)).toEqual([
      "alpha.pdf",
      "zeta.pdf",
    ]);
  });

  it("finds a cv profile by id", () => {
    const profiles = [
      makeCvProfile({
        id: "cv-11",
        fileName: "ml.pdf",
        profileType: dataCvType,
      }),
      makeCvProfile({
        id: "cv-12",
        fileName: "systems.pdf",
        profileType: softwareCvType,
      }),
    ];

    expect(findStudentCvProfileById(profiles, "cv-12")?.fileName).toBe("systems.pdf");
    expect(findStudentCvProfileById(profiles, "missing-profile")).toBeNull();
  });

  it("formats compact display values", () => {
    expect(formatStudentDisplayName(null)).toBe("New student");
    expect(formatStudentDisplayName(makeStudent({ firstName: "Grace", lastName: "Hopper" }))).toBe(
      "Grace Hopper",
    );

    expect(formatFileSize(900)).toBe("900 B");
    expect(formatFileSize(20_480)).toBe("20.0 KB");
    expect(formatFileSize(2_621_440)).toBe("2.5 MB");
  });
});
