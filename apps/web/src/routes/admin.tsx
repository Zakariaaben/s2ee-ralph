import { createFileRoute, redirect } from "@tanstack/react-router";

import { AdminShell } from "@/components/admin/admin-shell";
import { getUser } from "@/functions/get-user";
import { getAdminIndexRedirectPath } from "@/lib/admin-routing";
import { getProtectedRouteRedirect } from "@/lib/route-auth";

export const Route = createFileRoute("/admin")({
  beforeLoad: async ({ location }) => {
    const redirectPath = getProtectedRouteRedirect(await getUser(), "admin");

    if (redirectPath != null) {
      throw redirect({ to: redirectPath });
    }

    const adminRedirectPath = getAdminIndexRedirectPath(location.pathname);

    if (adminRedirectPath != null) {
      throw redirect({ to: adminRedirectPath });
    }
  },
  component: AdminRouteComponent,
});

function AdminRouteComponent() {
  return <AdminShell />;
}
