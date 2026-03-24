import {
  ResolveStudentQrIdentityInput,
  UpsertStudentOnboardingInput,
} from "@project/rpc";
import { describe, expect, it } from "@effect/vitest";
import { Schema } from "effect";

describe("student rpc input schemas", () => {
  it("trims surrounding whitespace from onboarding fields", () => {
    expect(
      Schema.decodeUnknownSync(UpsertStudentOnboardingInput)({
        firstName: "  Ada  ",
        lastName: "  Lovelace  ",
        phoneNumber: "  +213 555 12 34  ",
        academicYear: "  5th year  ",
        major: "  Computer Science  ",
        institution: "  ESI  ",
        image: "  https://example.com/ada.png  ",
      }),
    ).toEqual({
      firstName: "Ada",
      lastName: "Lovelace",
      phoneNumber: "+213 555 12 34",
      academicYear: "5th year",
      major: "Computer Science",
      institution: "ESI",
      image: "https://example.com/ada.png",
    });
  });

  it("rejects blank onboarding fields", () => {
    expect(() =>
      Schema.decodeUnknownSync(UpsertStudentOnboardingInput)({
        firstName: "  ",
        lastName: "Lovelace",
        phoneNumber: "+213 555 12 34",
        academicYear: "5th year",
        major: "Computer Science",
        institution: "ESI",
        image: null,
      })
    ).toThrow();

    expect(() =>
      Schema.decodeUnknownSync(UpsertStudentOnboardingInput)({
        firstName: "Ada",
        lastName: "\n\t  ",
        phoneNumber: "+213 555 12 34",
        academicYear: "5th year",
        major: "Computer Science",
        institution: "ESI",
        image: null,
      })
    ).toThrow();

    expect(() =>
      Schema.decodeUnknownSync(UpsertStudentOnboardingInput)({
        firstName: "Ada",
        lastName: "Lovelace",
        phoneNumber: "   ",
        academicYear: "5th year",
        major: "Computer Science",
        institution: "ESI",
        image: null,
      })
    ).toThrow();

    expect(() =>
      Schema.decodeUnknownSync(UpsertStudentOnboardingInput)({
        firstName: "Ada",
        lastName: "Lovelace",
        phoneNumber: "+213 555 12 34",
        academicYear: "   ",
        major: "Computer Science",
        institution: "ESI",
        image: null,
      })
    ).toThrow();

    expect(() =>
      Schema.decodeUnknownSync(UpsertStudentOnboardingInput)({
        firstName: "Ada",
        lastName: "Lovelace",
        phoneNumber: "+213 555 12 34",
        academicYear: "5th year",
        major: "   ",
        institution: "ESI",
        image: null,
      })
    ).toThrow();

    expect(() =>
      Schema.decodeUnknownSync(UpsertStudentOnboardingInput)({
        firstName: "Ada",
        lastName: "Lovelace",
        phoneNumber: "+213 555 12 34",
        academicYear: "5th year",
        major: "Computer Science",
        institution: "   ",
        image: null,
      })
    ).toThrow();
  });

  it("decodes student QR identities to student ids", () => {
    expect(
      Schema.decodeUnknownSync(ResolveStudentQrIdentityInput)({
        qrIdentity: "  student:v1:student-123  ",
      }),
    ).toEqual({
      qrIdentity: "student-123",
    });
  });

  it("rejects malformed student QR identities", () => {
    expect(() =>
      Schema.decodeUnknownSync(ResolveStudentQrIdentityInput)({
        qrIdentity: "not-a-student-qr",
      })
    ).toThrow();

    expect(() =>
      Schema.decodeUnknownSync(ResolveStudentQrIdentityInput)({
        qrIdentity: "student:v1:   ",
      })
    ).toThrow();
  });
});
