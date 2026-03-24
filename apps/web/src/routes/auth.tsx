import { Outlet, createFileRoute, redirect } from "@tanstack/react-router";

import { AuthShell } from "@/components/auth/auth-shell";
import { getUser } from "@/functions/get-user";
import { getRedirectPathForSession } from "@/lib/route-auth";

export const Route = createFileRoute("/auth")({
  beforeLoad: async ({ location }) => {
    const normalizedPathname =
      location.pathname.length > 1 && location.pathname.endsWith("/")
        ? location.pathname.slice(0, -1)
        : location.pathname;
    const roleHomePath = getRedirectPathForSession(await getUser());

    if (roleHomePath != null) {
      throw redirect({ to: roleHomePath });
    }

    if (normalizedPathname === "/auth") {
      throw redirect({ to: "/auth/sign-in" });
    }
  },
  component: AuthLayoutRouteComponent,
});

function AuthLayoutRouteComponent() {
  return (
    <AuthShell>
      <Outlet />
    </AuthShell>
  );
}
