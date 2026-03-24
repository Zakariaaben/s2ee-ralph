import { Outlet, createFileRoute, redirect } from "@tanstack/react-router";
import { getUser } from "@/functions/get-user";
import { getProtectedRouteRedirect } from "@/lib/route-auth";

export const Route = createFileRoute("/student")({
  beforeLoad: async () => {
    const redirectPath = getProtectedRouteRedirect(await getUser(), "student");

    if (redirectPath != null) {
      throw redirect({ to: redirectPath });
    }
  },
  component: StudentRouteComponent,
});

function StudentRouteComponent() {
  return <Outlet />;
}
