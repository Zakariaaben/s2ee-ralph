import { createFileRoute } from "@tanstack/react-router";

import { AdminVocabulariesPage } from "@/components/admin/admin-vocabularies-page";

export const Route = createFileRoute("/admin/vocabularies")({
  component: AdminVocabulariesRouteComponent,
});

function AdminVocabulariesRouteComponent() {
  return <AdminVocabulariesPage />;
}
