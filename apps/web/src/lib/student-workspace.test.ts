import { CvProfile, CvProfileType, Student } from "@project/domain";
import { describe, expect, it } from "vitest";

import {
  formatFileSize,
  formatStudentDisplayName,
  summarizeStudentWorkspace,
} from "@/lib/student-workspace";

const softwareCvType = new CvProfileType({
  id: "software-engineering" as CvProfileType["id"],
  label: "Software Engineering",
});

describe("student workspace helper", () => {
  it("marks a fresh student as not ready when onboarding has not started", () => {
    const summary = summarizeStudentWorkspace({
      student: null,
      cvProfiles: [],
    });

    expect(summary.hasOnboardingProfile).toBe(false);
    expect(summary.hasUploadedCv).toBe(false);
    expect(summary.qrIdentityAvailable).toBe(false);
    expect(summary.isEventReady).toBe(false);
    expect(summary.completionPercent).toBe(0);
    expect(summary.nextStepLabel).toBe("Finish your onboarding profile.");
  });

  it("unlocks QR identity after onboarding while keeping event-ready blocked until a CV exists", () => {
    const summary = summarizeStudentWorkspace({
      student: new Student({
        id: "student_1" as Student["id"],
        firstName: "Ada",
        lastName: "Lovelace",
        course: "Computer Science",
      }),
      cvProfiles: [],
    });

    expect(summary.hasOnboardingProfile).toBe(true);
    expect(summary.hasUploadedCv).toBe(false);
    expect(summary.qrIdentityAvailable).toBe(true);
    expect(summary.isEventReady).toBe(false);
    expect(summary.completionPercent).toBe(67);
    expect(summary.nextStepLabel).toBe("Upload your first CV profile.");
  });

  it("marks the student ready once onboarding and CV coverage are both in place", () => {
    const summary = summarizeStudentWorkspace({
      student: new Student({
        id: "student_1" as Student["id"],
        firstName: "Ada",
        lastName: "Lovelace",
        course: "Computer Science",
      }),
      cvProfiles: [
        new CvProfile({
          id: "cv_1" as CvProfile["id"],
          studentId: "student_1" as Student["id"],
          profileType: softwareCvType,
          fileName: "ada-software.pdf",
          contentType: "application/pdf",
          fileSizeBytes: 230_000,
        }),
      ],
    });

    expect(summary.isEventReady).toBe(true);
    expect(summary.completionPercent).toBe(100);
    expect(summary.nextStepLabel).toBe("You are event-ready.");
  });

  it("formats student names and file sizes for compact UI display", () => {
    expect(formatStudentDisplayName(null)).toBe("New student");
    expect(
      formatStudentDisplayName(
        new Student({
          id: "student_1" as Student["id"],
          firstName: "Grace",
          lastName: "Hopper",
          course: "Computer Science",
        }),
      ),
    ).toBe("Grace Hopper");

    expect(formatFileSize(880)).toBe("880 B");
    expect(formatFileSize(20_480)).toBe("20.0 KB");
    expect(formatFileSize(2_621_440)).toBe("2.5 MB");
  });
});
