import { createFileRoute } from "@tanstack/react-router";
import { BriefcaseBusinessIcon } from "lucide-react";

import { RoleSurface } from "@/components/auth/role-surface";

export const Route = createFileRoute("/company")({
  component: CompanyRouteComponent,
});

function CompanyRouteComponent() {
  return (
    <RoleSurface
      description="Company users now land in a company-only surface after sign-in instead of the shared placeholder."
      expectedRole="company"
      highlights={[
        "Privileged company accounts use the shared auth entry but cannot self-register here.",
        "This route becomes the stable entry point for recruiter selection and interview operations in issue #23.",
        "Route access is role-checked against the current authenticated session before the page settles.",
      ]}
      icon={BriefcaseBusinessIcon}
      kicker="Company workspace"
      title="Company home"
    />
  );
}
