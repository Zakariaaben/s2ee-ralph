import { createFileRoute } from "@tanstack/react-router";

import { VenueDirectoryPage } from "@/components/venue-directory";
import { loadVenueDirectory } from "@/functions/load-venue-directory";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      {
        title: "Fair Directory",
      },
    ],
  }),
  loader: () => loadVenueDirectory(),
  component: HomeComponent,
});

function HomeComponent() {
  const snapshot = Route.useLoaderData();

  return <VenueDirectoryPage snapshot={snapshot} />;
}
