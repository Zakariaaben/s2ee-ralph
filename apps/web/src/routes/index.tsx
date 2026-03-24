import { createFileRoute } from "@tanstack/react-router";

import { PublicHome } from "@/components/public/public-home";

export const Route = createFileRoute("/")({
  component: HomeComponent,
});

function HomeComponent() {
  return <PublicHome />;
}
