import { PublishedVenueMap, VenueMapImage, VenueMapPin, VenueRoom } from "@project/domain";
import { describe, expect, it } from "vitest";

import {
  buildVenueMapRoomRows,
  buildVenueMapPinDraftRecord,
  calculateVenueMapPinCoordinates,
  countVenueMapPinDraftChanges,
  diffVenueMapPinDraftRecord,
  formatVenueMapPinPosition,
} from "@/lib/admin-map";

const roomA = new VenueRoom({
  id: "room_a" as VenueRoom["id"],
  code: "A1",
  companies: [],
});

const roomB = new VenueRoom({
  id: "room_b" as VenueRoom["id"],
  code: "B4",
  companies: [],
});

const publishedVenueMap = new PublishedVenueMap({
  image: new VenueMapImage({
    fileName: "venue-map.png",
    contentType: "image/png",
    contentsBase64: "aGVsbG8=",
  }),
  pins: [
    new VenueMapPin({
      room: roomB,
      xPercent: 75.55,
      yPercent: 20.2,
    }),
  ],
});

describe("admin map helper", () => {
  it("joins room rows against published pins while keeping room-code order stable", () => {
    expect(buildVenueMapRoomRows([roomB, roomA], publishedVenueMap)).toEqual([
      {
        room: roomA,
        pin: null,
      },
      {
        room: roomB,
        pin: publishedVenueMap.pins[0],
      },
    ]);
  });

  it("converts pointer coordinates into clamped percentages", () => {
    expect(
      calculateVenueMapPinCoordinates({
        clientX: 250,
        clientY: 160,
        bounds: {
          left: 50,
          top: 10,
          width: 400,
          height: 300,
        },
      }),
    ).toEqual({
      xPercent: 50,
      yPercent: 50,
    });

    expect(
      calculateVenueMapPinCoordinates({
        clientX: -100,
        clientY: 1000,
        bounds: {
          left: 0,
          top: 0,
          width: 200,
          height: 200,
        },
      }),
    ).toEqual({
      xPercent: 0,
      yPercent: 100,
    });
  });

  it("formats stored pin positions for compact operator labels", () => {
    expect(formatVenueMapPinPosition(publishedVenueMap.pins[0]!)).toBe("75.55% x, 20.20% y");
  });

  it("builds editable pin drafts from the published map", () => {
    expect(buildVenueMapPinDraftRecord(publishedVenueMap)).toEqual({
      [roomB.id]: {
        xPercent: 75.55,
        yPercent: 20.2,
      },
    });
  });

  it("diffs draft pins into upserts and deletes for save-on-commit editors", () => {
    const roomRows = buildVenueMapRoomRows([roomA, roomB], publishedVenueMap);

    expect(
      diffVenueMapPinDraftRecord({
        roomRows,
        publishedVenueMap,
        draftPins: {
          [roomA.id]: {
            xPercent: 15,
            yPercent: 25,
          },
        },
      }),
    ).toEqual({
      upserts: [
        {
          roomId: roomA.id,
          xPercent: 15,
          yPercent: 25,
        },
      ],
      deletes: [roomB.id],
    });

    expect(
      countVenueMapPinDraftChanges({
        roomRows,
        publishedVenueMap,
        draftPins: {
          [roomB.id]: {
            xPercent: 75.55,
            yPercent: 20.2,
          },
        },
      }),
    ).toBe(0);
  });
});
