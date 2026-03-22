import { createFileRoute } from "@tanstack/react-router";
import { GraduationCapIcon } from "lucide-react";

import { RoleSurface } from "@/components/auth/role-surface";

export const Route = createFileRoute("/student")({
  component: StudentRouteComponent,
});

function StudentRouteComponent() {
  return (
    <RoleSurface
      description="Students now have a dedicated landing surface instead of the generic placeholder page."
      expectedRole="student"
      highlights={[
        "Student self-registration routes here automatically after account creation.",
        "This route becomes the handoff point for the mobile-first readiness and CV workflow in issue #22.",
        "Unauthorized or differently privileged sessions are redirected back into their own primary surface.",
      ]}
      icon={GraduationCapIcon}
      kicker="Student workspace"
      title="Student home"
    />
  );
}
