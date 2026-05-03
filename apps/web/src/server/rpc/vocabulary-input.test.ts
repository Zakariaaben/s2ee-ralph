import {
  ReplaceVocabularyEntriesInput,
  SeedControlledVocabulariesInput,
  VocabularyEntryIdInput,
  VocabularyEntryInput,
} from "@project/rpc";
import { describe, expect, it } from "@effect/vitest";
import { Schema } from "effect";

describe("vocabulary rpc input schemas", () => {
  it("trims surrounding whitespace from vocabulary ids and labels", () => {
    expect(
      Schema.decodeUnknownSync(VocabularyEntryInput)({
        id: "  software-engineering  ",
        label: "  Software Engineering  ",
      }),
    ).toEqual({
      id: "software-engineering",
      label: "Software Engineering",
    });

    expect(
      Schema.decodeUnknownSync(VocabularyEntryIdInput)({
        id: "  software-engineering  ",
      }),
    ).toEqual({
      id: "software-engineering",
    });

    expect(
      Schema.decodeUnknownSync(ReplaceVocabularyEntriesInput)({
        entries: [
          { id: "  software-engineering  ", label: "  Software Engineering  " },
        ],
      }),
    ).toEqual({
      entries: [
        { id: "software-engineering", label: "Software Engineering" },
      ],
    });

    expect(
      Schema.decodeUnknownSync(SeedControlledVocabulariesInput)({
        cvProfileTypes: [
          { id: "  software-engineering  ", label: "  Software Engineering  " },
        ],
        globalInterviewTags: [
          { id: "  follow-up  ", label: "  Follow Up  " },
        ],
        studentInstitutions: [
          { id: "  esi  ", label: "  ESI  " },
        ],
        studentMajors: [
          { id: "  data-science  ", label: "  Data Science  " },
        ],
      }),
    ).toEqual({
      cvProfileTypes: [
        { id: "software-engineering", label: "Software Engineering" },
      ],
      globalInterviewTags: [
        { id: "follow-up", label: "Follow Up" },
      ],
      studentInstitutions: [
        { id: "esi", label: "ESI" },
      ],
      studentMajors: [
        { id: "data-science", label: "Data Science" },
      ],
    });
  });

  it("rejects blank vocabulary ids and labels", () => {
    expect(() =>
      Schema.decodeUnknownSync(VocabularyEntryInput)({
        id: "   ",
        label: "Software Engineering",
      })
    ).toThrow();

    expect(() =>
      Schema.decodeUnknownSync(VocabularyEntryInput)({
        id: "software-engineering",
        label: "\n\t  ",
      })
    ).toThrow();

    expect(() =>
      Schema.decodeUnknownSync(VocabularyEntryIdInput)({
        id: "   ",
      })
    ).toThrow();
  });

  it("rejects duplicate vocabulary ids within replacement and seed payloads", () => {
    expect(() =>
      Schema.decodeUnknownSync(ReplaceVocabularyEntriesInput)({
        entries: [
          { id: " software-engineering ", label: "Software Engineering" },
          { id: "software-engineering", label: "Software Eng" },
        ],
      })
    ).toThrow();

    expect(() =>
      Schema.decodeUnknownSync(SeedControlledVocabulariesInput)({
        cvProfileTypes: [
          { id: "backend", label: "Backend" },
          { id: " backend ", label: "Backend Duplicate" },
        ],
        globalInterviewTags: [
          { id: "hire", label: "Hire" },
        ],
        studentInstitutions: [],
        studentMajors: [],
      })
    ).toThrow();

    expect(() =>
      Schema.decodeUnknownSync(SeedControlledVocabulariesInput)({
        cvProfileTypes: [
          { id: "backend", label: "Backend" },
        ],
        globalInterviewTags: [
          { id: "follow-up", label: "Follow Up" },
          { id: " follow-up ", label: "Follow Up Duplicate" },
        ],
        studentInstitutions: [],
        studentMajors: [],
      })
    ).toThrow();
  });
});
