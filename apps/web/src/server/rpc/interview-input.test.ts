import { CancelInterviewInput, CompleteInterviewInput, StartInterviewInput } from "@project/rpc";
import { describe, expect, it } from "@effect/vitest";
import { Schema } from "effect";

describe("interview rpc input schemas", () => {
  it("decodes presented profile identities and trims company tag labels", () => {
    expect(
      Schema.decodeUnknownSync(StartInterviewInput)({
        recruiterId: "recruiter-1",
        presentationIdentity: "  profile:v1:cv-profile-1  ",
      }),
    ).toEqual({
      recruiterId: "recruiter-1",
      presentationIdentity: "cv-profile-1",
    });

    expect(
      Schema.decodeUnknownSync(CompleteInterviewInput)({
        interviewId: "interview-1",
        score: 4.3,
        globalTagIds: ["curious"],
        companyTagLabels: ["  Backend Ready  ", "  Follow Up  "],
        notes: "  Strong backend fundamentals.  ",
      }),
    ).toEqual({
      interviewId: "interview-1",
      score: 4.3,
      globalTagIds: ["curious"],
      companyTagLabels: ["Backend Ready", "Follow Up"],
      notes: "Strong backend fundamentals.",
    });

    expect(
      Schema.decodeUnknownSync(CancelInterviewInput)({
        interviewId: "interview-1",
        notes: "  Could not complete badge verification. ",
      }),
    ).toEqual({
      interviewId: "interview-1",
      notes: "Could not complete badge verification.",
    });
  });

  it("rejects malformed presented profile identities", () => {
    expect(() =>
      Schema.decodeUnknownSync(StartInterviewInput)({
        recruiterId: "recruiter-1",
        presentationIdentity: "   ",
      })
    ).toThrow();
  });

  it("rejects scores outside the allowed interview range", () => {
    expect(() =>
      Schema.decodeUnknownSync(CompleteInterviewInput)({
        interviewId: "interview-1",
        score: 0.9,
        globalTagIds: [],
        companyTagLabels: [],
        notes: "",
      })
    ).toThrow();

    expect(() =>
      Schema.decodeUnknownSync(CompleteInterviewInput)({
        interviewId: "interview-1",
        score: 5.1,
        globalTagIds: [],
        companyTagLabels: [],
        notes: "",
      })
    ).toThrow();
  });

  it("rejects blank company tag labels", () => {
    expect(() =>
      Schema.decodeUnknownSync(CompleteInterviewInput)({
        interviewId: "interview-1",
        score: 4.3,
        globalTagIds: [],
        companyTagLabels: ["  Backend Ready  ", "\n\t  "],
        notes: "",
      })
    ).toThrow();
  });
});
