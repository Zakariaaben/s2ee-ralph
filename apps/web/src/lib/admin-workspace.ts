import type {
  AdminAccessLedgerEntry,
  AdminCompanyLedgerEntry,
  AdminInterviewLedgerEntry,
  UserRoleValue,
} from "@project/domain";

export const adminInterviewPreviewLimit = 6;

export type AdminWorkspaceSummary = {
  readonly companyCount: number;
  readonly placedCompanyCount: number;
  readonly unplacedCompanyCount: number;
  readonly arrivedCompanyCount: number;
  readonly pendingArrivalCount: number;
  readonly interviewCount: number;
  readonly completedInterviewCount: number;
  readonly cancelledInterviewCount: number;
  readonly accessEntryCount: number;
  readonly adminCount: number;
  readonly studentCount: number;
  readonly companyAccountCount: number;
  readonly checkInCount: number;
  readonly nextOperationalLabel: string;
};

const normalizeQuery = (value: string): string => value.trim().toLowerCase();

export const summarizeAdminWorkspace = (input: {
  readonly companyLedger: ReadonlyArray<AdminCompanyLedgerEntry>;
  readonly interviewLedger: ReadonlyArray<AdminInterviewLedgerEntry>;
  readonly accessLedger: ReadonlyArray<AdminAccessLedgerEntry>;
}): AdminWorkspaceSummary => {
  const placedCompanyCount = input.companyLedger.filter((entry) => entry.room != null).length;
  const arrivedCompanyCount = input.companyLedger.filter(
    (entry) => entry.arrivalStatus === "arrived",
  ).length;
  const completedInterviewCount = input.interviewLedger.filter(
    (entry) => entry.interview.status === "completed",
  ).length;
  const cancelledInterviewCount = input.interviewLedger.length - completedInterviewCount;
  const adminCount = input.accessLedger.filter((entry) => entry.user.role === "admin").length;
  const studentCount = input.accessLedger.filter((entry) => entry.user.role === "student").length;
  const companyAccountCount = input.accessLedger.filter(
    (entry) => entry.user.role === "company",
  ).length;
  const checkInCount = input.accessLedger.filter((entry) => entry.user.role === "check-in").length;
  const pendingPlacementCount = input.companyLedger.length - placedCompanyCount;
  const pendingArrivalCount = input.companyLedger.filter(
    (entry) => entry.room != null && entry.arrivalStatus === "not-arrived",
  ).length;

  let nextOperationalLabel = "Aucune action immediate.";

  if (pendingPlacementCount > 0) {
    nextOperationalLabel =
      pendingPlacementCount === 1
        ? "1 entreprise doit encore etre placee."
        : `${pendingPlacementCount} entreprises doivent encore etre placees.`;
  } else if (pendingArrivalCount > 0) {
    nextOperationalLabel =
      pendingArrivalCount === 1
        ? "1 entreprise attend encore sa confirmation d'arrivee."
        : `${pendingArrivalCount} entreprises attendent encore leur confirmation d'arrivee.`;
  } else if (checkInCount === 0) {
    nextOperationalLabel = "Aucun compte accueil n'a encore ete cree.";
  }

  return {
    companyCount: input.companyLedger.length,
    placedCompanyCount,
    unplacedCompanyCount: pendingPlacementCount,
    arrivedCompanyCount,
    pendingArrivalCount,
    interviewCount: input.interviewLedger.length,
    completedInterviewCount,
    cancelledInterviewCount,
    accessEntryCount: input.accessLedger.length,
    adminCount,
    studentCount,
    companyAccountCount,
    checkInCount,
    nextOperationalLabel,
  };
};

export const filterAdminCompanyLedger = (
  entries: ReadonlyArray<AdminCompanyLedgerEntry>,
  input: {
    readonly query: string;
    readonly arrival: "all" | "arrived" | "pending";
    readonly placement: "all" | "placed" | "unplaced";
  },
): ReadonlyArray<AdminCompanyLedgerEntry> => {
  const normalizedQuery = normalizeQuery(input.query);

  return entries.filter((entry) => {
    if (input.arrival === "arrived" && entry.arrivalStatus !== "arrived") {
      return false;
    }

    if (input.arrival === "pending" && entry.arrivalStatus !== "not-arrived") {
      return false;
    }

    if (input.placement === "placed" && entry.room == null) {
      return false;
    }

    if (input.placement === "unplaced" && entry.room != null) {
      return false;
    }

    if (normalizedQuery.length === 0) {
      return true;
    }

    return [
      entry.company.name,
      entry.room?.code ?? "",
      entry.standNumber == null ? "" : String(entry.standNumber),
      ...entry.company.recruiters.map((recruiter) => recruiter.name),
    ].some((value) => value.toLowerCase().includes(normalizedQuery));
  });
};

export const filterAdminAccessLedger = (
  entries: ReadonlyArray<AdminAccessLedgerEntry>,
  input: {
    readonly query: string;
    readonly role: "all" | UserRoleValue;
  },
): ReadonlyArray<AdminAccessLedgerEntry> => {
  const normalizedQuery = normalizeQuery(input.query);

  return entries.filter((entry) => {
    if (input.role !== "all" && entry.user.role !== input.role) {
      return false;
    }

    if (normalizedQuery.length === 0) {
      return true;
    }

    return [
      describeAdminAccessAccount(entry),
      entry.user.email,
      entry.user.role,
      entry.student == null ? "" : `${entry.student.firstName} ${entry.student.lastName}`,
      entry.company?.name ?? "",
    ].some((value) => value.toLowerCase().includes(normalizedQuery));
  });
};

export const filterAdminInterviewLedger = (
  entries: ReadonlyArray<AdminInterviewLedgerEntry>,
  input: {
    readonly query: string;
    readonly status: "all" | "completed" | "cancelled";
  },
): ReadonlyArray<AdminInterviewLedgerEntry> => {
  const normalizedQuery = normalizeQuery(input.query);

  return entries.filter((entry) => {
    if (input.status !== "all" && entry.interview.status !== input.status) {
      return false;
    }

    if (normalizedQuery.length === 0) {
      return true;
    }

    return [
      entry.company.name,
      `${entry.student.firstName} ${entry.student.lastName}`,
      entry.student.major,
      entry.student.institution,
      entry.interview.recruiterName,
      entry.cvProfile.profileType.label,
      entry.cvProfile.fileName,
      ...entry.interview.globalTags.map((tag) => tag.label),
      ...entry.interview.companyTags.map((tag) => tag.label),
    ].some((value) => value.toLowerCase().includes(normalizedQuery));
  });
};

export const selectRecentAdminInterviews = (
  entries: ReadonlyArray<AdminInterviewLedgerEntry>,
  limit = adminInterviewPreviewLimit,
): ReadonlyArray<AdminInterviewLedgerEntry> =>
  entries.slice(Math.max(entries.length - limit, 0)).slice().reverse();

export const describeAdminAccessSubject = (entry: AdminAccessLedgerEntry): string => {
  if (entry.company != null) {
    return entry.company.name;
  }

  if (entry.student != null) {
    return `${entry.student.firstName} ${entry.student.lastName}`;
  }

  return "Aucun profil lie";
};

export const describeAdminAccessAccount = (entry: AdminAccessLedgerEntry): string => {
  if (entry.company != null) {
    return entry.company.name;
  }

  if (entry.student != null) {
    return `${entry.student.firstName} ${entry.student.lastName}`;
  }

  return entry.user.email;
};

export const describeAdminPlacement = (entry: AdminCompanyLedgerEntry): string =>
  entry.room == null
    ? "Non placee"
    : entry.standNumber == null
      ? `Salle ${entry.room.code}`
      : `Salle ${entry.room.code} / Stand ${entry.standNumber}`;
