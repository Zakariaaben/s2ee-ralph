import { createFileRoute } from "@tanstack/react-router";

import { AdminWorkspace } from "@/components/admin/admin-workspace";

export const Route = createFileRoute("/admin")({
  component: AdminRouteComponent,
});

function AdminRouteComponent() {
  return <AdminWorkspace />;
}
