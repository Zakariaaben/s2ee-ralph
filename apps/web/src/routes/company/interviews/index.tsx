import { createFileRoute } from "@tanstack/react-router";

import { CompanyWorkspace } from "@/components/company/company-workspace";

export const Route = createFileRoute("/company/interviews/")({
  component: CompanyInterviewsRouteComponent,
});

function CompanyInterviewsRouteComponent() {
  return <CompanyWorkspace initialSubview="interviews" />;
}
