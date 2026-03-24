export type AdminSectionId =
  | "overview"
  | "companies"
  | "venue"
  | "map"
  | "access"
  | "interviews";

export type AdminSection = {
  readonly id: AdminSectionId;
  readonly label: string;
  readonly title: string;
  readonly description: string;
  readonly to: `/admin/${AdminSectionId}`;
};

export const adminSections: ReadonlyArray<AdminSection> = [
  {
    id: "overview",
    label: "Overview",
    title: "Operational overview",
    description: "Event state and module entry points.",
    to: "/admin/overview",
  },
  {
    id: "companies",
    label: "Companies",
    title: "Companies and recruiters",
    description: "Company records and recruiter rosters.",
    to: "/admin/companies",
  },
  {
    id: "venue",
    label: "Venue",
    title: "Venue logistics",
    description: "Rooms, stands, and placements.",
    to: "/admin/venue",
  },
  {
    id: "map",
    label: "Map",
    title: "Public map",
    description: "Map image publication and room pins.",
    to: "/admin/map",
  },
  {
    id: "access",
    label: "Access",
    title: "Access control",
    description: "User ledger and role assignment.",
    to: "/admin/access",
  },
  {
    id: "interviews",
    label: "Interviews",
    title: "Interview review",
    description: "Interview ledger and filtering.",
    to: "/admin/interviews",
  },
] as const;

export const getAdminIndexRedirectPath = (pathname: string): string | null => {
  if (pathname === "/admin" || pathname === "/admin/") {
    return "/admin/overview";
  }

  return null;
};

