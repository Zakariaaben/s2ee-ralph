import { createFileRoute } from "@tanstack/react-router";

import { AdminCompaniesPage } from "@/components/admin/admin-companies-page";

export const Route = createFileRoute("/admin/companies")({
  component: AdminCompaniesRouteComponent,
});

function AdminCompaniesRouteComponent() {
  return <AdminCompaniesPage />;
}

