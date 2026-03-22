import { CancelInterviewInput, CompleteInterviewInput } from "@project/rpc";
import { describe, expect, it } from "@effect/vitest";
import { Schema } from "effect";

describe("interview rpc input schemas", () => {
  it("decodes student QR identities and trims company tag labels", () => {
    expect(
      Schema.decodeUnknownSync(CompleteInterviewInput)({
        recruiterId: "recruiter-1",
        qrIdentity: "  student:v1:student-123  ",
        cvProfileId: "cv-profile-1",
        score: 4.3,
        globalTagIds: ["curious"],
        companyTagLabels: ["  Backend Ready  ", "  Follow Up  "],
      }),
    ).toEqual({
      recruiterId: "recruiter-1",
      qrIdentity: "student-123",
      cvProfileId: "cv-profile-1",
      score: 4.3,
      globalTagIds: ["curious"],
      companyTagLabels: ["Backend Ready", "Follow Up"],
    });

    expect(
      Schema.decodeUnknownSync(CancelInterviewInput)({
        recruiterId: "recruiter-1",
        qrIdentity: "\n student:v1:student-123 \t",
        cvProfileId: "cv-profile-1",
      }),
    ).toEqual({
      recruiterId: "recruiter-1",
      qrIdentity: "student-123",
      cvProfileId: "cv-profile-1",
    });
  });

  it("rejects malformed student QR identities", () => {
    expect(() =>
      Schema.decodeUnknownSync(CompleteInterviewInput)({
        recruiterId: "recruiter-1",
        qrIdentity: "not-a-student-qr",
        cvProfileId: "cv-profile-1",
        score: 4.3,
        globalTagIds: [],
        companyTagLabels: [],
      })
    ).toThrow();

    expect(() =>
      Schema.decodeUnknownSync(CancelInterviewInput)({
        recruiterId: "recruiter-1",
        qrIdentity: "student:v1:   ",
        cvProfileId: "cv-profile-1",
      })
    ).toThrow();
  });

  it("rejects scores outside the allowed interview range", () => {
    expect(() =>
      Schema.decodeUnknownSync(CompleteInterviewInput)({
        recruiterId: "recruiter-1",
        qrIdentity: "student:v1:student-123",
        cvProfileId: "cv-profile-1",
        score: 0.9,
        globalTagIds: [],
        companyTagLabels: [],
      })
    ).toThrow();

    expect(() =>
      Schema.decodeUnknownSync(CompleteInterviewInput)({
        recruiterId: "recruiter-1",
        qrIdentity: "student:v1:student-123",
        cvProfileId: "cv-profile-1",
        score: 5.1,
        globalTagIds: [],
        companyTagLabels: [],
      })
    ).toThrow();
  });

  it("rejects blank company tag labels", () => {
    expect(() =>
      Schema.decodeUnknownSync(CompleteInterviewInput)({
        recruiterId: "recruiter-1",
        qrIdentity: "student:v1:student-123",
        cvProfileId: "cv-profile-1",
        score: 4.3,
        globalTagIds: [],
        companyTagLabels: ["  Backend Ready  ", "\n\t  "],
      })
    ).toThrow();
  });
});
