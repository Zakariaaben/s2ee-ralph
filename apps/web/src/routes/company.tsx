import { createFileRoute } from "@tanstack/react-router";

import { CompanyWorkspace } from "@/components/company/company-workspace";

export const Route = createFileRoute("/company")({
  component: CompanyRouteComponent,
});

function CompanyRouteComponent() {
  return <CompanyWorkspace />;
}
