import type { PublishedVenueMap, VenueMapPin, VenueRoom } from "@project/domain";

export type PublicVenueMapSummary = {
  readonly arrivedCompanyCount: number;
  readonly pinnedRoomCount: number;
  readonly placedCompanyCount: number;
  readonly pendingCompanyCount: number;
};

const byRoomCode = (left: VenueMapPin, right: VenueMapPin): number =>
  left.room.code.localeCompare(right.room.code);

const normalizeQuery = (value: string): string => value.trim().toLowerCase();

export const sortPublishedVenueMapPins = (
  publishedVenueMap: PublishedVenueMap | null,
): ReadonlyArray<VenueMapPin> =>
  publishedVenueMap == null ? [] : [...publishedVenueMap.pins].sort(byRoomCode);

export const filterPublishedVenueMapPins = (
  pins: ReadonlyArray<VenueMapPin>,
  query: string,
): ReadonlyArray<VenueMapPin> => {
  const normalizedQuery = normalizeQuery(query);

  if (normalizedQuery.length === 0) {
    return pins;
  }

  return pins.filter((pin) =>
    [
      pin.room.code,
      ...pin.room.companies.map((company) => company.companyName),
      ...pin.room.companies.map((company) => String(company.standNumber)),
      ...pin.room.companies.map((company) => `stand ${company.standNumber}`),
    ].some((value) => value.toLowerCase().includes(normalizedQuery)),
  );
};

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
    return `La salle ${pin.room.code} n'a pas encore d'entreprise affichee.`;
  }

  if (pin.room.companies.length === 1) {
    const company = pin.room.companies[0]!;
    const arrivalLabel =
      company.arrivalStatus === "arrived" ? "arrivee sur place" : "pas encore marquee arrivee";

    return `${company.companyName} est au stand ${company.standNumber} et est ${arrivalLabel}.`;
  }

  const arrivedCount = pin.room.companies.filter(
    (company) => company.arrivalStatus === "arrived",
  ).length;

  return `${pin.room.companies.length} entreprises sont placees ici, dont ${arrivedCount} marquees arrivees.`;
};
