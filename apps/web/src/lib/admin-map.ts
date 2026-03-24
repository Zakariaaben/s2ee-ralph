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

export type VenueMapPinDraft = {
  readonly xPercent: number;
  readonly yPercent: number;
};

export type VenueMapPinDraftRecord = Partial<Record<string, VenueMapPinDraft>>;

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

export const buildVenueMapPinDraftRecord = (
  publishedVenueMap: PublishedVenueMap | null,
): VenueMapPinDraftRecord =>
  Object.fromEntries(
    (publishedVenueMap?.pins ?? []).map((pin) => [
      pin.room.id,
      {
        xPercent: pin.xPercent,
        yPercent: pin.yPercent,
      },
    ]),
  );

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

export const diffVenueMapPinDraftRecord = (input: {
  readonly roomRows: ReadonlyArray<AdminVenueMapRoomRow>;
  readonly publishedVenueMap: PublishedVenueMap | null;
  readonly draftPins: VenueMapPinDraftRecord;
}): {
  readonly upserts: ReadonlyArray<{
    readonly roomId: VenueRoom["id"];
    readonly xPercent: number;
    readonly yPercent: number;
  }>;
  readonly deletes: ReadonlyArray<VenueRoom["id"]>;
} => {
  const originalPins = new Map(
    (input.publishedVenueMap?.pins ?? []).map((pin) => [
      pin.room.id as string,
      {
        xPercent: pin.xPercent,
        yPercent: pin.yPercent,
      },
    ]),
  );
  const roomIds = input.roomRows.map((entry) => entry.room.id as string);
  const upserts: Array<{
    readonly roomId: VenueRoom["id"];
    readonly xPercent: number;
    readonly yPercent: number;
  }> = [];
  const deletes: Array<VenueRoom["id"]> = [];

  for (const roomId of roomIds) {
    const nextPin = input.draftPins[roomId];
    const currentPin = originalPins.get(roomId);

    if (!nextPin && currentPin) {
      deletes.push(roomId as VenueRoom["id"]);
      continue;
    }

    if (!nextPin) {
      continue;
    }

    if (
      !currentPin ||
      currentPin.xPercent !== nextPin.xPercent ||
      currentPin.yPercent !== nextPin.yPercent
    ) {
      upserts.push({
        roomId: roomId as VenueRoom["id"],
        xPercent: nextPin.xPercent,
        yPercent: nextPin.yPercent,
      });
    }
  }

  return {
    upserts,
    deletes,
  };
};

export const countVenueMapPinDraftChanges = (input: {
  readonly roomRows: ReadonlyArray<AdminVenueMapRoomRow>;
  readonly publishedVenueMap: PublishedVenueMap | null;
  readonly draftPins: VenueMapPinDraftRecord;
}): number => {
  const diff = diffVenueMapPinDraftRecord(input);

  return diff.upserts.length + diff.deletes.length;
};
