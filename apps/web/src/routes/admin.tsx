import { createFileRoute } from "@tanstack/react-router";
import { ShieldCheckIcon } from "lucide-react";

import { RoleSurface } from "@/components/auth/role-surface";

export const Route = createFileRoute("/admin")({
  component: AdminRouteComponent,
});

function AdminRouteComponent() {
  return (
    <RoleSurface
      description="Admins now receive a dedicated operational landing route immediately after authentication."
      expectedRole="admin"
      highlights={[
        "This route is the post-auth target for organizer-created admin accounts.",
        "The page intentionally stays thin so issue #27 can layer the real operations interface on top of a stable auth destination.",
        "Non-admin sessions are redirected away instead of lingering on the admin surface.",
      ]}
      icon={ShieldCheckIcon}
      kicker="Admin workspace"
      title="Admin home"
    />
  );
}
