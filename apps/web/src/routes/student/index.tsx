import { createFileRoute } from "@tanstack/react-router";

import { StudentWorkspace } from "@/components/student/student-workspace";

export const Route = createFileRoute("/student/")({
  component: StudentIndexRouteComponent,
});

function StudentIndexRouteComponent() {
  return <StudentWorkspace />;
}
