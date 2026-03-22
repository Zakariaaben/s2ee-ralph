import type { AdminCompanyLedgerEntry, VenueRoom } from "@project/domain";

const normalizeQuery = (value: string): string => value.trim().toLowerCase();

export type AdminVenueRoomSummary = {
  readonly room: VenueRoom;
  readonly companyCount: number;
  readonly arrivedCount: number;
  readonly pendingCount: number;
};

export const summarizeVenueRoom = (room: VenueRoom): AdminVenueRoomSummary => {
  const arrivedCount = room.companies.filter((company) => company.arrivalStatus === "arrived").length;

  return {
    room,
    companyCount: room.companies.length,
    arrivedCount,
    pendingCount: room.companies.length - arrivedCount,
  };
};

export const sortVenueRoomSummaries = (
  rooms: ReadonlyArray<VenueRoom>,
): ReadonlyArray<AdminVenueRoomSummary> =>
  rooms
    .map(summarizeVenueRoom)
    .slice()
    .sort((left, right) => left.room.code.localeCompare(right.room.code));

export const filterVenueRoomSummaries = (
  rooms: ReadonlyArray<VenueRoom>,
  query: string,
): ReadonlyArray<AdminVenueRoomSummary> => {
  const normalizedQuery = normalizeQuery(query);
  const summaries = sortVenueRoomSummaries(rooms);

  if (normalizedQuery.length === 0) {
    return summaries;
  }

  return summaries.filter((summary) =>
    [
      summary.room.code,
      ...summary.room.companies.map((company) => company.companyName),
      ...summary.room.companies.map((company) => String(company.standNumber)),
    ].some((value) => value.toLowerCase().includes(normalizedQuery)),
  );
};

export const sortPlacementManagementCompanies = (
  entries: ReadonlyArray<AdminCompanyLedgerEntry>,
): ReadonlyArray<AdminCompanyLedgerEntry> =>
  entries.slice().sort((left, right) => {
    if (left.room == null && right.room != null) {
      return -1;
    }

    if (left.room != null && right.room == null) {
      return 1;
    }

    if (left.room != null && right.room != null) {
      const byRoom = left.room.code.localeCompare(right.room.code);

      if (byRoom !== 0) {
        return byRoom;
      }

      const leftStand = left.standNumber ?? Number.MAX_SAFE_INTEGER;
      const rightStand = right.standNumber ?? Number.MAX_SAFE_INTEGER;

      if (leftStand !== rightStand) {
        return leftStand - rightStand;
      }
    }

    return left.company.name.localeCompare(right.company.name);
  });

export const filterPlacementManagementCompanies = (
  entries: ReadonlyArray<AdminCompanyLedgerEntry>,
  query: string,
): ReadonlyArray<AdminCompanyLedgerEntry> => {
  const normalizedQuery = normalizeQuery(query);
  const sortedEntries = sortPlacementManagementCompanies(entries);

  if (normalizedQuery.length === 0) {
    return sortedEntries;
  }

  return sortedEntries.filter((entry) =>
    [
      entry.company.name,
      entry.room?.code ?? "",
      entry.standNumber == null ? "" : String(entry.standNumber),
      entry.arrivalStatus,
      ...entry.company.recruiters.map((recruiter) => recruiter.name),
    ].some((value) => value.toLowerCase().includes(normalizedQuery)),
  );
};

export const describeVenueRoomOccupancy = (summary: AdminVenueRoomSummary): string => {
  if (summary.companyCount === 0) {
    return "No companies assigned";
  }

  if (summary.companyCount === 1) {
    return summary.pendingCount === 0 ? "1 company assigned and arrived" : "1 company assigned";
  }

  return summary.pendingCount === 0
    ? `${summary.companyCount} companies assigned, all arrived`
    : `${summary.companyCount} companies assigned`;
};
