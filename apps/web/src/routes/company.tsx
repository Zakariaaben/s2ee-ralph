import { Outlet, createFileRoute, redirect } from "@tanstack/react-router";

import { getUser } from "@/functions/get-user";
import { getProtectedRouteRedirect } from "@/lib/route-auth";

export const Route = createFileRoute("/company")({
  beforeLoad: async () => {
    const redirectPath = getProtectedRouteRedirect(await getUser(), "company");

    if (redirectPath != null) {
      throw redirect({ to: redirectPath });
    }
  },
  component: CompanyRouteComponent,
});

function CompanyRouteComponent() {
  return <Outlet />;
}
