import { createFileRoute } from "@tanstack/react-router";
import { CheckInWorkspace } from "@/components/check-in/check-in-workspace";

export const Route = createFileRoute("/check-in")({
  component: CheckInRouteComponent,
});

function CheckInRouteComponent() {
  return <CheckInWorkspace />;
}
