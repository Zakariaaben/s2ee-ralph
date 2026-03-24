import { createFileRoute } from "@tanstack/react-router";

import { CompanyWorkspace } from "@/components/company/company-workspace";

export const Route = createFileRoute("/company/")({
  component: CompanyIndexRouteComponent,
});

function CompanyIndexRouteComponent() {
  return <CompanyWorkspace />;
}
