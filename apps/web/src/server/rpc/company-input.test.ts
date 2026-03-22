import {
  AddRecruiterInput,
  RenameRecruiterInput,
  UpsertCompanyProfileInput,
} from "@project/rpc";
import { describe, expect, it } from "@effect/vitest";
import { Schema } from "effect";

describe("company rpc input schemas", () => {
  it("trims surrounding whitespace from company and recruiter names", () => {
    expect(
      Schema.decodeUnknownSync(UpsertCompanyProfileInput)({
        name: "  Acme Systems  ",
      }),
    ).toEqual({
      name: "Acme Systems",
    });

    expect(
      Schema.decodeUnknownSync(AddRecruiterInput)({
        name: "  Nora Recruiter  ",
      }),
    ).toEqual({
      name: "Nora Recruiter",
    });

    expect(
      Schema.decodeUnknownSync(RenameRecruiterInput)({
        recruiterId: "recruiter-1",
        name: "  Nora Updated  ",
      }),
    ).toEqual({
      recruiterId: "recruiter-1",
      name: "Nora Updated",
    });
  });

  it("rejects blank company and recruiter names", () => {
    expect(() =>
      Schema.decodeUnknownSync(UpsertCompanyProfileInput)({
        name: "   ",
      })
    ).toThrow();

    expect(() =>
      Schema.decodeUnknownSync(AddRecruiterInput)({
        name: "\n\t  ",
      })
    ).toThrow();

    expect(() =>
      Schema.decodeUnknownSync(RenameRecruiterInput)({
        recruiterId: "recruiter-1",
        name: "   ",
      })
    ).toThrow();
  });
});
