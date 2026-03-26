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
    label: "Apercu",
    title: "Apercu",
    description: "",
    to: "/admin/overview",
  },
  {
    id: "companies",
    label: "Entreprises",
    title: "Entreprises",
    description: "",
    to: "/admin/companies",
  },
  {
    id: "venue",
    label: "Salles",
    title: "Salles",
    description: "",
    to: "/admin/venue",
  },
  {
    id: "map",
    label: "Plan",
    title: "Plan",
    description: "",
    to: "/admin/map",
  },
  {
    id: "access",
    label: "Acces",
    title: "Acces",
    description: "",
    to: "/admin/access",
  },
  {
    id: "interviews",
    label: "Entretiens",
    title: "Entretiens",
    description: "",
    to: "/admin/interviews",
  },
] as const;

export const getAdminIndexRedirectPath = (pathname: string): string | null => {
  if (pathname === "/admin" || pathname === "/admin/") {
    return "/admin/overview";
  }

  return null;
};
