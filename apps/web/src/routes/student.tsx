import { createFileRoute } from "@tanstack/react-router";
import { StudentWorkspace } from "@/components/student/student-workspace";

export const Route = createFileRoute("/student")({
  component: StudentRouteComponent,
});

function StudentRouteComponent() {
  return <StudentWorkspace />;
}
