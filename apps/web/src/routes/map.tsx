import { createFileRoute } from "@tanstack/react-router";

import { PublicVenueMap } from "@/components/public/public-venue-map";

export const Route = createFileRoute("/map")({
  component: PublicVenueMapRouteComponent,
});

function PublicVenueMapRouteComponent() {
  return <PublicVenueMap />;
}
