import { createFileRoute } from "@tanstack/react-router";

import { AdminVenuePage } from "@/components/admin/admin-venue-page";

export const Route = createFileRoute("/admin/venue")({
  component: AdminVenueRouteComponent,
});

function AdminVenueRouteComponent() {
  return <AdminVenuePage />;
}

