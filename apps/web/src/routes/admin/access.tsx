import { createFileRoute } from "@tanstack/react-router";

import { AdminAccessPage } from "@/components/admin/admin-access-page";

export const Route = createFileRoute("/admin/access")({
  component: AdminAccessRouteComponent,
});

function AdminAccessRouteComponent() {
  return <AdminAccessPage />;
}

