import { createFileRoute } from "@tanstack/react-router";
import { ClipboardCheckIcon } from "lucide-react";

import { RoleSurface } from "@/components/auth/role-surface";

export const Route = createFileRoute("/check-in")({
  component: CheckInRouteComponent,
});

function CheckInRouteComponent() {
  return (
    <RoleSurface
      description="Check-in staff now bypass the generic placeholder and land in their own narrow operational route."
      expectedRole="check-in"
      highlights={[
        "Check-in remains a privileged role that signs in through the shared auth entry.",
        "Issue #26 can now build the arrival-management experience on a stable role-specific route.",
        "Sessions that do not belong to check-in staff are sent back to their correct role surface.",
      ]}
      icon={ClipboardCheckIcon}
      kicker="Check-in workspace"
      title="Check-in home"
    />
  );
}
