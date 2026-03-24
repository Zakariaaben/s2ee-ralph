import { createFileRoute } from "@tanstack/react-router";

import { CompanyInterviewsPage } from "@/components/company/company-interviews-page";

export const Route = createFileRoute("/company/interviews/")({
  component: CompanyInterviewsRouteComponent,
});

function CompanyInterviewsRouteComponent() {
  return <CompanyInterviewsPage />;
}
