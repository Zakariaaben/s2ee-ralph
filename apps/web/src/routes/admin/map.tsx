import { createFileRoute } from "@tanstack/react-router";

import { AdminMapPage } from "@/components/admin/admin-map-page";

export const Route = createFileRoute("/admin/map")({
  component: AdminMapRouteComponent,
});

function AdminMapRouteComponent() {
  return <AdminMapPage />;
}
