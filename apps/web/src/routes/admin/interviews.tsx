import { createFileRoute } from "@tanstack/react-router";

import { AdminInterviewsPage } from "@/components/admin/admin-interviews-page";

export const Route = createFileRoute("/admin/interviews")({
  component: AdminInterviewsRouteComponent,
});

function AdminInterviewsRouteComponent() {
  return <AdminInterviewsPage />;
}
