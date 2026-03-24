import { createFileRoute, redirect } from "@tanstack/react-router";

import { StudentProfileDetail } from "@/components/student/student-profile-detail";
import { getUser } from "@/functions/get-user";
import { getProtectedRouteRedirect } from "@/lib/route-auth";

export const Route = createFileRoute("/student/profiles/$profileId")({
  beforeLoad: async () => {
    const redirectPath = getProtectedRouteRedirect(await getUser(), "student");

    if (redirectPath != null) {
      throw redirect({ to: redirectPath });
    }
  },
  component: StudentProfileDetailRouteComponent,
});

function StudentProfileDetailRouteComponent() {
  const { profileId } = Route.useParams();

  return <StudentProfileDetail profileId={profileId} />;
}
