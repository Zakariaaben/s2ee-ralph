import { PublishedVenueMap, VenueCompany, VenueMapImage, VenueMapPin, VenueRoom } from "@project/domain";
import { describe, expect, it } from "vitest";

import {
  describePublishedVenueRoom,
  resolvePublishedVenueMapSelection,
  sortPublishedVenueMapPins,
  summarizePublishedVenueMap,
} from "@/lib/public-venue-map";

const makeVenueCompany = (input: {
  readonly id: string;
  readonly name: string;
  readonly standNumber: number;
  readonly arrivalStatus: "arrived" | "not-arrived";
}) =>
  new VenueCompany({
    companyId: input.id as VenueCompany["companyId"],
    companyName: input.name,
    standNumber: input.standNumber,
    arrivalStatus: input.arrivalStatus,
  });

const roomB = new VenueRoom({
  id: "room_b" as VenueRoom["id"],
  code: "B4",
  companies: [
    makeVenueCompany({
      id: "company-2",
      name: "Beacon Labs",
      standNumber: 14,
      arrivalStatus: "arrived",
    }),
  ],
});

const roomA = new VenueRoom({
  id: "room_a" as VenueRoom["id"],
  code: "A1",
  companies: [
    makeVenueCompany({
      id: "company-1",
      name: "Atlas Systems",
      standNumber: 8,
      arrivalStatus: "not-arrived",
    }),
    makeVenueCompany({
      id: "company-3",
      name: "Northwind Works",
      standNumber: 10,
      arrivalStatus: "arrived",
    }),
  ],
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
      xPercent: 82,
      yPercent: 40,
    }),
    new VenueMapPin({
      room: roomA,
      xPercent: 25,
      yPercent: 60,
    }),
  ],
});

describe("public venue map helper", () => {
  it("sorts published pins by room code for stable map navigation", () => {
    expect(sortPublishedVenueMapPins(publishedVenueMap).map((pin) => pin.room.code)).toEqual([
      "A1",
      "B4",
    ]);
  });

  it("keeps a valid selection and falls back to the first pinned room", () => {
    const sortedPins = sortPublishedVenueMapPins(publishedVenueMap);

    expect(
      resolvePublishedVenueMapSelection(
        sortedPins,
        "room_b" as VenueRoom["id"],
      ),
    ).toBe("room_b");
    expect(
      resolvePublishedVenueMapSelection(
        sortedPins,
        "missing" as VenueRoom["id"],
      ),
    ).toBe("room_a");
    expect(resolvePublishedVenueMapSelection([], null)).toBeNull();
  });

  it("summarizes pinned rooms and operational company counts", () => {
    expect(summarizePublishedVenueMap(publishedVenueMap)).toEqual({
      pinnedRoomCount: 2,
      placedCompanyCount: 3,
      arrivedCompanyCount: 2,
      pendingCompanyCount: 1,
    });
  });

  it("describes room placement context for the detail panel", () => {
    expect(describePublishedVenueRoom(publishedVenueMap.pins[1]!)).toBe(
      "2 companies are placed here, with 1 marked arrived.",
    );
    expect(describePublishedVenueRoom(publishedVenueMap.pins[0]!)).toBe(
      "Beacon Labs is at stand 14 and is arrived on site.",
    );
  });
});
