import { createFileRoute, redirect } from "@tanstack/react-router";

import { AdminWorkspace } from "@/components/admin/admin-workspace";
import { getUser } from "@/functions/get-user";
import { getProtectedRouteRedirect } from "@/lib/route-auth";

export const Route = createFileRoute("/admin")({
  beforeLoad: async () => {
    const redirectPath = getProtectedRouteRedirect(await getUser(), "admin");

    if (redirectPath != null) {
      throw redirect({ to: redirectPath });
    }
  },
  component: AdminRouteComponent,
});

function AdminRouteComponent() {
  return <AdminWorkspace />;
}
