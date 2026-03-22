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
        course: "  Computer Science  ",
      }),
    ).toEqual({
      firstName: "Ada",
      lastName: "Lovelace",
      course: "Computer Science",
    });
  });

  it("rejects blank onboarding fields", () => {
    expect(() =>
      Schema.decodeUnknownSync(UpsertStudentOnboardingInput)({
        firstName: "  ",
        lastName: "Lovelace",
        course: "Computer Science",
      })
    ).toThrow();

    expect(() =>
      Schema.decodeUnknownSync(UpsertStudentOnboardingInput)({
        firstName: "Ada",
        lastName: "\n\t  ",
        course: "Computer Science",
      })
    ).toThrow();

    expect(() =>
      Schema.decodeUnknownSync(UpsertStudentOnboardingInput)({
        firstName: "Ada",
        lastName: "Lovelace",
        course: "   ",
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
