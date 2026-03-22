import {
  AssignCompanyPlacementInput,
  CreateRoomInput,
  UpdateRoomInput,
} from "@project/rpc";
import { describe, expect, it } from "@effect/vitest";
import { Schema } from "effect";

describe("venue rpc input schemas", () => {
  it("normalizes room codes by trimming and uppercasing them", () => {
    expect(
      Schema.decodeUnknownSync(CreateRoomInput)({
        code: "  cp3  ",
      }),
    ).toEqual({
      code: "CP3",
    });
  });

  it("rejects blank room codes", () => {
    expect(() =>
      Schema.decodeUnknownSync(CreateRoomInput)({
        code: "  \n\t ",
      })
    ).toThrow();
  });

  it("rejects stand numbers that are not positive integers", () => {
    expect(() =>
      Schema.decodeUnknownSync(AssignCompanyPlacementInput)({
        companyId: "company-1",
        roomId: "room-1",
        standNumber: 0,
      })
    ).toThrow();

    expect(() =>
      Schema.decodeUnknownSync(AssignCompanyPlacementInput)({
        companyId: "company-1",
        roomId: "room-1",
        standNumber: -1,
      })
    ).toThrow();

    expect(() =>
      Schema.decodeUnknownSync(AssignCompanyPlacementInput)({
        companyId: "company-1",
        roomId: "room-1",
        standNumber: 1.5,
      })
    ).toThrow();
  });

  it("normalizes update-room payloads with the same room-code rules", () => {
    expect(
      Schema.decodeUnknownSync(UpdateRoomInput)({
        roomId: "room-1",
        code: "  s27  ",
      }),
    ).toEqual({
      roomId: "room-1",
      code: "S27",
    });
  });
});
