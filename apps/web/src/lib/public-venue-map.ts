import type { PublishedVenueMap, VenueMapPin, VenueRoom } from "@project/domain";

export type PublicVenueMapSummary = {
  readonly arrivedCompanyCount: number;
  readonly pinnedRoomCount: number;
  readonly placedCompanyCount: number;
  readonly pendingCompanyCount: number;
};

const byRoomCode = (left: VenueMapPin, right: VenueMapPin): number =>
  left.room.code.localeCompare(right.room.code);

export const sortPublishedVenueMapPins = (
  publishedVenueMap: PublishedVenueMap | null,
): ReadonlyArray<VenueMapPin> =>
  publishedVenueMap == null ? [] : [...publishedVenueMap.pins].sort(byRoomCode);

export const resolvePublishedVenueMapSelection = (
  pins: ReadonlyArray<VenueMapPin>,
  selectedRoomId: VenueRoom["id"] | null,
): VenueRoom["id"] | null => {
  if (pins.length === 0) {
    return null;
  }

  if (selectedRoomId != null && pins.some((pin) => pin.room.id === selectedRoomId)) {
    return selectedRoomId;
  }

  return pins[0]!.room.id;
};

export const summarizePublishedVenueMap = (
  publishedVenueMap: PublishedVenueMap | null,
): PublicVenueMapSummary => {
  const pins = sortPublishedVenueMapPins(publishedVenueMap);
  const placedCompanies = pins.flatMap((pin) => pin.room.companies);
  const arrivedCompanyCount = placedCompanies.filter(
    (company) => company.arrivalStatus === "arrived",
  ).length;

  return {
    pinnedRoomCount: pins.length,
    placedCompanyCount: placedCompanies.length,
    arrivedCompanyCount,
    pendingCompanyCount: placedCompanies.length - arrivedCompanyCount,
  };
};

export const describePublishedVenueRoom = (pin: VenueMapPin): string => {
  if (pin.room.companies.length === 0) {
    return `Room ${pin.room.code} has no published company placements yet.`;
  }

  if (pin.room.companies.length === 1) {
    const company = pin.room.companies[0]!;
    const arrivalLabel =
      company.arrivalStatus === "arrived" ? "arrived on site" : "not marked arrived yet";

    return `${company.companyName} is at stand ${company.standNumber} and is ${arrivalLabel}.`;
  }

  const arrivedCount = pin.room.companies.filter(
    (company) => company.arrivalStatus === "arrived",
  ).length;

  return `${pin.room.companies.length} companies are placed here, with ${arrivedCount} marked arrived.`;
};
