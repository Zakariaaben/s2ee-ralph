import { createFileRoute, redirect } from "@tanstack/react-router";
import { CheckInWorkspace } from "@/components/check-in/check-in-workspace";
import { getUser } from "@/functions/get-user";
import { getProtectedRouteRedirect } from "@/lib/route-auth";

export const Route = createFileRoute("/check-in")({
  beforeLoad: async () => {
    const redirectPath = getProtectedRouteRedirect(await getUser(), "check-in");

    if (redirectPath != null) {
      throw redirect({ to: redirectPath });
    }
  },
  component: CheckInRouteComponent,
});

function CheckInRouteComponent() {
  return <CheckInWorkspace />;
}
