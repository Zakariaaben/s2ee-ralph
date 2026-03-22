import {
  DeleteVocabularyEntryInput,
  ReplaceVocabularyEntriesInput,
  SeedControlledVocabulariesInput,
  SeedVocabularyEntryInput,
} from "@project/rpc";
import { describe, expect, it } from "@effect/vitest";
import { Schema } from "effect";

describe("vocabulary rpc input schemas", () => {
  it("trims surrounding whitespace from vocabulary ids and labels", () => {
    expect(
      Schema.decodeUnknownSync(SeedVocabularyEntryInput)({
        id: "  software-engineering  ",
        label: "  Software Engineering  ",
      }),
    ).toEqual({
      id: "software-engineering",
      label: "Software Engineering",
    });

    expect(
      Schema.decodeUnknownSync(DeleteVocabularyEntryInput)({
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
  });

  it("rejects blank vocabulary ids and labels", () => {
    expect(() =>
      Schema.decodeUnknownSync(SeedVocabularyEntryInput)({
        id: "   ",
        label: "Software Engineering",
      })
    ).toThrow();

    expect(() =>
      Schema.decodeUnknownSync(SeedVocabularyEntryInput)({
        id: "software-engineering",
        label: "\n\t  ",
      })
    ).toThrow();

    expect(() =>
      Schema.decodeUnknownSync(DeleteVocabularyEntryInput)({
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
      })
    ).toThrow();
  });
});
