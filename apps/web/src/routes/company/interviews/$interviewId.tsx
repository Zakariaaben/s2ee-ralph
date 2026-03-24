import type { Interview } from "@project/domain";
import { createFileRoute } from "@tanstack/react-router";

import { CompanyInterviewDetail } from "@/components/company/company-interview-detail";

export const Route = createFileRoute("/company/interviews/$interviewId")({
  component: CompanyInterviewDetailRouteComponent,
});

function CompanyInterviewDetailRouteComponent() {
  const { interviewId } = Route.useParams();

  return <CompanyInterviewDetail interviewId={interviewId as Interview["id"]} />;
}
