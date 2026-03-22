import { createFileRoute } from "@tanstack/react-router";

import { AuthEntry } from "@/components/auth/auth-entry";

export const Route = createFileRoute("/")({
  component: HomeComponent,
});

function HomeComponent() {
  return <AuthEntry />;
}
