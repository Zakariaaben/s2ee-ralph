import { CreateStudentCvProfileInput } from "@project/rpc";
import { describe, expect, it } from "@effect/vitest";
import { Schema } from "effect";

describe("cv profile rpc input schemas", () => {
  it("trims surrounding whitespace from CV profile metadata and base64 contents", () => {
    expect(
      Schema.decodeUnknownSync(CreateStudentCvProfileInput)({
        profileTypeId: "  software-engineering  ",
        fileName: "  ada-software.pdf  ",
        contentType: "  application/pdf  ",
        contentsBase64: "  Zm9v  ",
      }),
    ).toEqual({
      profileTypeId: "software-engineering",
      fileName: "ada-software.pdf",
      contentType: "application/pdf",
      contentsBase64: "Zm9v",
    });
  });

  it("rejects blank CV profile metadata fields", () => {
    expect(() =>
      Schema.decodeUnknownSync(CreateStudentCvProfileInput)({
        profileTypeId: "   ",
        fileName: "ada-software.pdf",
        contentType: "application/pdf",
        contentsBase64: "Zm9v",
      })
    ).toThrow();

    expect(() =>
      Schema.decodeUnknownSync(CreateStudentCvProfileInput)({
        profileTypeId: "software-engineering",
        fileName: "\n\t ",
        contentType: "application/pdf",
        contentsBase64: "Zm9v",
      })
    ).toThrow();

    expect(() =>
      Schema.decodeUnknownSync(CreateStudentCvProfileInput)({
        profileTypeId: "software-engineering",
        fileName: "ada-software.pdf",
        contentType: "   ",
        contentsBase64: "Zm9v",
      })
    ).toThrow();
  });

  it("rejects non-pdf file names and content types", () => {
    expect(() =>
      Schema.decodeUnknownSync(CreateStudentCvProfileInput)({
        profileTypeId: "software-engineering",
        fileName: "ada-software.docx",
        contentType: "application/pdf",
        contentsBase64: "Zm9v",
      })
    ).toThrow();

    expect(() =>
      Schema.decodeUnknownSync(CreateStudentCvProfileInput)({
        profileTypeId: "software-engineering",
        fileName: "ada-software.pdf",
        contentType: "application/msword",
        contentsBase64: "Zm9v",
      })
    ).toThrow();
  });

  it("rejects blank or malformed base64 file contents", () => {
    expect(() =>
      Schema.decodeUnknownSync(CreateStudentCvProfileInput)({
        profileTypeId: "software-engineering",
        fileName: "ada-software.pdf",
        contentType: "application/pdf",
        contentsBase64: "   ",
      })
    ).toThrow();

    expect(() =>
      Schema.decodeUnknownSync(CreateStudentCvProfileInput)({
        profileTypeId: "software-engineering",
        fileName: "ada-software.pdf",
        contentType: "application/pdf",
        contentsBase64: "not-base64",
      })
    ).toThrow();

    expect(() =>
      Schema.decodeUnknownSync(CreateStudentCvProfileInput)({
        profileTypeId: "software-engineering",
        fileName: "ada-software.pdf",
        contentType: "application/pdf",
        contentsBase64: "***",
      })
    ).toThrow();
  });
});
