import type {
  CompanyArrivalStatusValue,
  VenueCompany,
  VenueRoom,
} from "@project/domain";

export type CheckInCompanyEntry = {
  readonly arrivalStatus: CompanyArrivalStatusValue;
  readonly companyId: VenueCompany["companyId"];
  readonly companyName: string;
  readonly roomCode: string;
  readonly roomId: VenueRoom["id"];
  readonly standNumber: number;
};

export type CheckInWorkspaceSummary = {
  readonly arrivedCount: number;
  readonly pendingCount: number;
  readonly placedCompanyCount: number;
  readonly roomCount: number;
  readonly nextArrivalLabel: string;
};

const normalizeQuery = (value: string): string => value.trim().toLowerCase();

export const flattenCheckInCompanies = (
  rooms: ReadonlyArray<VenueRoom>,
): ReadonlyArray<CheckInCompanyEntry> =>
  rooms.flatMap((room) =>
    room.companies.map((company) => ({
      roomId: room.id,
      roomCode: room.code,
      companyId: company.companyId,
      companyName: company.companyName,
      standNumber: company.standNumber,
      arrivalStatus: company.arrivalStatus,
    })),
  );

export const summarizeCheckInWorkspace = (
  rooms: ReadonlyArray<VenueRoom>,
): CheckInWorkspaceSummary => {
  const companies = flattenCheckInCompanies(rooms);
  const arrivedCount = companies.filter((company) => company.arrivalStatus === "arrived").length;
  const pendingCount = companies.length - arrivedCount;
  const nextPendingCompany = companies.find((company) => company.arrivalStatus === "not-arrived");

  return {
    roomCount: rooms.length,
    placedCompanyCount: companies.length,
    arrivedCount,
    pendingCount,
    nextArrivalLabel:
      nextPendingCompany == null
        ? "Toutes les entreprises placees sont marquees arrivees."
        : `${nextPendingCompany.companyName} est la prochaine entreprise a accueillir.`,
  };
};

export const filterCheckInCompanies = (
  companies: ReadonlyArray<CheckInCompanyEntry>,
  input: {
    readonly query: string;
    readonly roomId: VenueRoom["id"] | null;
    readonly status: "all" | "arrived" | "pending";
  },
): ReadonlyArray<CheckInCompanyEntry> => {
  const normalizedQuery = normalizeQuery(input.query);

  return companies.filter((company) => {
    if (input.roomId != null && company.roomId !== input.roomId) {
      return false;
    }

    if (input.status === "arrived" && company.arrivalStatus !== "arrived") {
      return false;
    }

    if (input.status === "pending" && company.arrivalStatus !== "not-arrived") {
      return false;
    }

    if (normalizedQuery.length === 0) {
      return true;
    }

    return [
      company.companyName,
      company.roomCode,
      `stand ${company.standNumber}`,
      String(company.standNumber),
    ].some((value) => value.toLowerCase().includes(normalizedQuery));
  });
};
