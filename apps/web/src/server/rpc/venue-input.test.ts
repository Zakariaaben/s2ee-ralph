import {
  AssignCompanyPlacementInput,
  CreateRoomInput,
  PublishVenueMapInput,
  UpsertVenueMapRoomPinInput,
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

  it("requires image content types and non-empty base64 map contents", () => {
    expect(
      Schema.decodeUnknownSync(PublishVenueMapInput)({
        fileName: " venue-map.png ",
        contentType: "image/png",
        contentsBase64: "aGVsbG8=",
      }),
    ).toEqual({
      fileName: "venue-map.png",
      contentType: "image/png",
      contentsBase64: "aGVsbG8=",
    });

    expect(() =>
      Schema.decodeUnknownSync(PublishVenueMapInput)({
        fileName: "venue-map.png",
        contentType: "application/pdf",
        contentsBase64: "aGVsbG8=",
      })
    ).toThrow();
  });

  it("rejects room-pin coordinates outside the map bounds", () => {
    expect(
      Schema.decodeUnknownSync(UpsertVenueMapRoomPinInput)({
        roomId: "room-1",
        xPercent: 50,
        yPercent: 12.5,
      }),
    ).toEqual({
      roomId: "room-1",
      xPercent: 50,
      yPercent: 12.5,
    });

    expect(() =>
      Schema.decodeUnknownSync(UpsertVenueMapRoomPinInput)({
        roomId: "room-1",
        xPercent: -1,
        yPercent: 30,
      })
    ).toThrow();

    expect(() =>
      Schema.decodeUnknownSync(UpsertVenueMapRoomPinInput)({
        roomId: "room-1",
        xPercent: 20,
        yPercent: 101,
      })
    ).toThrow();
  });
});
