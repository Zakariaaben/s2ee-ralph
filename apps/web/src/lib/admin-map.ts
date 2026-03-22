import type { PublishedVenueMap, VenueMapPin, VenueRoom } from "@project/domain";

export type VenueMapBounds = {
  readonly left: number;
  readonly top: number;
  readonly width: number;
  readonly height: number;
};

export type AdminVenueMapRoomRow = {
  readonly room: VenueRoom;
  readonly pin: VenueMapPin | null;
};

const roundCoordinate = (value: number): number => Math.round(value * 100) / 100;

const clamp = (value: number): number => Math.min(100, Math.max(0, value));

export const buildVenueMapRoomRows = (
  rooms: ReadonlyArray<VenueRoom>,
  publishedVenueMap: PublishedVenueMap | null,
): ReadonlyArray<AdminVenueMapRoomRow> => {
  const pinsByRoomId = new Map(
    (publishedVenueMap?.pins ?? []).map((pin) => [pin.room.id, pin]),
  );

  return rooms
    .slice()
    .sort((left, right) => left.code.localeCompare(right.code))
    .map((room) => ({
      room,
      pin: pinsByRoomId.get(room.id) ?? null,
    }));
};

export const calculateVenueMapPinCoordinates = (input: {
  readonly clientX: number;
  readonly clientY: number;
  readonly bounds: VenueMapBounds;
}): {
  readonly xPercent: number;
  readonly yPercent: number;
} => {
  const relativeX = ((input.clientX - input.bounds.left) / input.bounds.width) * 100;
  const relativeY = ((input.clientY - input.bounds.top) / input.bounds.height) * 100;

  return {
    xPercent: roundCoordinate(clamp(relativeX)),
    yPercent: roundCoordinate(clamp(relativeY)),
  };
};

export const formatVenueMapPinPosition = (pin: VenueMapPin): string =>
  `${pin.xPercent.toFixed(2)}% x, ${pin.yPercent.toFixed(2)}% y`;
