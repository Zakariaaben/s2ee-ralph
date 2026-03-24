import { createFileRoute } from "@tanstack/react-router";

import { SignUpForm } from "@/components/auth/sign-up-form";

export const Route = createFileRoute("/auth/sign-up")({
  component: SignUpRouteComponent,
});

function SignUpRouteComponent() {
  return <SignUpForm />;
}
