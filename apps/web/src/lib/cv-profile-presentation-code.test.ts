import {
  decodeCvProfilePresentationCode,
  encodeCvProfilePresentationCode,
} from "@project/domain";
import { describe, expect, it } from "vitest";

describe("cv profile presentation code", () => {
  it("encodes cv profile ids into a six-character uppercase code", () => {
    expect(
      encodeCvProfilePresentationCode("5d957d59-0bdb-4183-afbb-baefd4b713c9"),
    ).toBe("B713C9");
  });

  it("normalizes valid presentation code input and rejects invalid values", () => {
    expect(decodeCvProfilePresentationCode(" b7-13 c9 ")).toBe("B713C9");
    expect(decodeCvProfilePresentationCode("12345")).toBeNull();
    expect(decodeCvProfilePresentationCode("1234567")).toBeNull();
    expect(decodeCvProfilePresentationCode("******")).toBeNull();
  });
});
