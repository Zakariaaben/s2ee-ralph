import { createFileRoute } from "@tanstack/react-router";

import { AdminOverviewPage } from "@/components/admin/admin-overview-page";

export const Route = createFileRoute("/admin/overview")({
  component: AdminOverviewRouteComponent,
});

function AdminOverviewRouteComponent() {
  return <AdminOverviewPage />;
}

