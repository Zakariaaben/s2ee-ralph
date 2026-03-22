"use client";

import type { UserRoleValue } from "@project/domain";
import { Badge } from "@project/ui/components/badge";
import { Button } from "@project/ui/components/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@project/ui/components/card";
import { Input } from "@project/ui/components/input";
import { Separator } from "@project/ui/components/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@project/ui/components/tabs";
import { cn } from "@project/ui/lib/utils";
import {
  ArrowRightIcon,
  CheckCircle2Icon,
  CompassIcon,
  ShieldCheckIcon,
  UserRoundPlusIcon,
  UsersRoundIcon,
} from "lucide-react";
import type React from "react";
import { useEffect, useEffectEvent, useState } from "react";

import { authClient } from "@/lib/auth-client";
import { getRoleHomePath } from "@/lib/auth-routing";

type AuthMode = "sign-in" | "sign-up";

type SignInState = {
  readonly email: string;
  readonly password: string;
};

type SignUpState = {
  readonly email: string;
  readonly password: string;
  readonly name: string;
};

const roleSignals = [
  {
    description: "Self-service sign-up stays limited to student accounts.",
    icon: UserRoundPlusIcon,
    title: "Students register here",
  },
  {
    description: "Company, admin, and check-in access remains pre-provisioned.",
    icon: ShieldCheckIcon,
    title: "Privileged roles sign in only",
  },
  {
    description: "Each role is routed into its own working surface after auth.",
    icon: CompassIcon,
    title: "Role-aware entry",
  },
] as const;

const routeNotes = [
  { label: "Student", note: "CV workspace and onboarding readiness", to: "/student" },
  { label: "Company", note: "Recruiter workspace and interview flow", to: "/company" },
  { label: "Admin", note: "Operations and access management", to: "/admin" },
  { label: "Check-in", note: "Focused arrival operations", to: "/check-in" },
] as const;

export function AuthEntry(): React.ReactElement {
  const session = authClient.useSession();
  const [mode, setMode] = useState<AuthMode>("sign-in");
  const [signInState, setSignInState] = useState<SignInState>({ email: "", password: "" });
  const [signUpState, setSignUpState] = useState<SignUpState>({
    email: "",
    password: "",
    name: "",
  });
  const [signInError, setSignInError] = useState<string | null>(null);
  const [signUpError, setSignUpError] = useState<string | null>(null);
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [isSigningUp, setIsSigningUp] = useState(false);

  const navigateToRoleHome = useEffectEvent((role: UserRoleValue | undefined) => {
    if (!role) {
      return;
    }

    window.location.replace(getRoleHomePath(role));
  });

  const currentRole = (session.data?.user as { role?: UserRoleValue } | undefined)?.role;

  useEffect(() => {
    if (session.isPending) {
      return;
    }

    navigateToRoleHome(currentRole);
  }, [currentRole, navigateToRoleHome, session.isPending]);

  const completeAuthFlow = async () => {
    const currentSession = await authClient.getSession();

    if (currentSession.error) {
      return currentSession.error.message ?? "Authentication succeeded but the session could not be resolved.";
    }

    navigateToRoleHome((currentSession.data?.user as { role?: UserRoleValue } | undefined)?.role);
    return null;
  };

  const handleSignIn = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSigningIn(true);
    setSignInError(null);

    try {
      const result = await authClient.signIn.email({
        email: signInState.email,
        password: signInState.password,
      });

      if (result.error) {
        setSignInError(result.error.message ?? "Unable to sign in with those credentials.");
        return;
      }

      const postAuthError = await completeAuthFlow();
      setSignInError(postAuthError);
    } finally {
      setIsSigningIn(false);
    }
  };

  const handleSignUp = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSigningUp(true);
    setSignUpError(null);

    try {
      const result = await authClient.signUp.email({
        email: signUpState.email,
        name: signUpState.name,
        password: signUpState.password,
      });

      if (result.error) {
        setSignUpError(result.error.message ?? "Unable to create the student account.");
        return;
      }

      const postAuthError = await completeAuthFlow();
      setSignUpError(postAuthError);
    } finally {
      setIsSigningUp(false);
    }
  };

  if (session.isPending) {
    return (
      <main className="min-h-screen bg-background px-6 py-10 text-foreground sm:px-8">
        <div className="mx-auto flex min-h-[calc(100vh-5rem)] max-w-6xl items-center justify-center">
          <Card className="w-full max-w-md border-border/70 bg-card/90 backdrop-blur">
            <CardHeader>
              <CardTitle>Checking session</CardTitle>
              <CardDescription>Loading the shared entry point.</CardDescription>
            </CardHeader>
          </Card>
        </div>
      </main>
    );
  }

  return (
    <main
      className="min-h-screen overflow-hidden bg-background px-6 py-8 text-foreground sm:px-8"
      style={{
        ["--font-heading" as string]: '"Fraunces", "Times New Roman", serif',
        ["--font-sans" as string]: '"Manrope", "Segoe UI", sans-serif',
      }}
    >
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute inset-x-0 top-0 h-72 bg-[radial-gradient(circle_at_top,rgba(245,158,11,0.18),transparent_60%)]" />
        <div className="absolute right-[-8rem] top-32 size-64 rounded-full bg-emerald-500/10 blur-3xl" />
        <div className="absolute left-[-6rem] top-96 size-72 rounded-full bg-amber-500/10 blur-3xl" />
      </div>

      <div className="relative mx-auto grid min-h-[calc(100vh-4rem)] max-w-6xl gap-6 lg:grid-cols-[1.15fr_0.85fr]">
        <section className="flex flex-col justify-between rounded-[2rem] border border-border/60 bg-card/70 p-6 shadow-sm backdrop-blur sm:p-8">
          <div className="space-y-8">
            <div className="space-y-5">
              <div className="flex flex-wrap gap-3">
                <Badge variant="outline" size="lg" className="rounded-full px-4">
                  Shared event entry
                </Badge>
                <Button variant="secondary" onClick={() => window.location.assign("/map")}>
                  Public venue map
                  <ArrowRightIcon />
                </Button>
              </div>
              <div className="max-w-2xl space-y-4">
                <h1 className="font-heading text-4xl leading-none tracking-tight sm:text-5xl lg:text-6xl">
                  One door in.
                  <br />
                  Four role surfaces out.
                </h1>
                <p className="max-w-xl text-base text-muted-foreground sm:text-lg">
                  Students can create their own accounts here. Company, admin, and check-in users use
                  the same sign-in entry with organizer-created credentials.
                </p>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              {roleSignals.map((signal) => (
                <Card key={signal.title} className="border-border/60 bg-background/70">
                  <CardHeader className="gap-3">
                    <div className="flex size-11 items-center justify-center rounded-2xl bg-primary/8 text-primary">
                      <signal.icon className="size-5" />
                    </div>
                    <div className="space-y-1">
                      <CardTitle className="text-base">{signal.title}</CardTitle>
                      <CardDescription>{signal.description}</CardDescription>
                    </div>
                  </CardHeader>
                </Card>
              ))}
            </div>
          </div>

          <Card className="border-border/60 bg-background/70">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <UsersRoundIcon className="size-4" />
                Post-auth routing map
              </CardTitle>
              <CardDescription>The shared entry hands each role to a dedicated starting surface.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-2">
              {routeNotes.map((route) => (
                <div
                  key={route.label}
                  className="rounded-2xl border border-border/60 bg-card px-4 py-3"
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className="font-medium">{route.label}</span>
                    <Badge variant="secondary">{route.to}</Badge>
                  </div>
                  <p className="mt-2 text-sm text-muted-foreground">{route.note}</p>
                </div>
              ))}
            </CardContent>
          </Card>
        </section>

        <section className="flex items-center">
          <Card className="w-full border-border/60 bg-card/90 shadow-sm backdrop-blur">
            <CardHeader className="space-y-3">
              <CardTitle className="font-heading text-3xl tracking-tight">Access the platform</CardTitle>
              <CardDescription>
                One sign-in entry for every role. Student registration always creates a student account.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <Tabs
                value={mode}
                onValueChange={(value) => setMode(value as AuthMode)}
                className="gap-5"
              >
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="sign-in">Sign in</TabsTrigger>
                  <TabsTrigger value="sign-up">Student sign-up</TabsTrigger>
                </TabsList>

                <TabsContent value="sign-in">
                  <form className="space-y-4" onSubmit={handleSignIn}>
                    <div className="space-y-2">
                      <label className="text-sm font-medium" htmlFor="sign-in-email">
                        Email
                      </label>
                      <Input
                        id="sign-in-email"
                        autoComplete="email"
                        inputMode="email"
                        placeholder="you@event.local"
                        type="email"
                        value={signInState.email}
                        onChange={(event) =>
                          setSignInState((current) => ({ ...current, email: event.target.value }))
                        }
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium" htmlFor="sign-in-password">
                        Password
                      </label>
                      <Input
                        id="sign-in-password"
                        autoComplete="current-password"
                        placeholder="Your password"
                        type="password"
                        value={signInState.password}
                        onChange={(event) =>
                          setSignInState((current) => ({ ...current, password: event.target.value }))
                        }
                      />
                    </div>

                    {signInError ? (
                      <div className="rounded-2xl border border-destructive/20 bg-destructive/6 px-4 py-3 text-sm text-destructive-foreground">
                        {signInError}
                      </div>
                    ) : null}

                    <Button className="w-full" loading={isSigningIn} size="lg" type="submit">
                      Continue to workspace
                      <ArrowRightIcon />
                    </Button>
                  </form>
                </TabsContent>

                <TabsContent value="sign-up">
                  <form className="space-y-4" onSubmit={handleSignUp}>
                    <div className="space-y-2">
                      <label className="text-sm font-medium" htmlFor="sign-up-name">
                        Full name
                      </label>
                      <Input
                        id="sign-up-name"
                        autoComplete="name"
                        placeholder="Student name"
                        value={signUpState.name}
                        onChange={(event) =>
                          setSignUpState((current) => ({ ...current, name: event.target.value }))
                        }
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium" htmlFor="sign-up-email">
                        Email
                      </label>
                      <Input
                        id="sign-up-email"
                        autoComplete="email"
                        inputMode="email"
                        placeholder="student@event.local"
                        type="email"
                        value={signUpState.email}
                        onChange={(event) =>
                          setSignUpState((current) => ({ ...current, email: event.target.value }))
                        }
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium" htmlFor="sign-up-password">
                        Password
                      </label>
                      <Input
                        id="sign-up-password"
                        autoComplete="new-password"
                        placeholder="Create a password"
                        type="password"
                        value={signUpState.password}
                        onChange={(event) =>
                          setSignUpState((current) => ({ ...current, password: event.target.value }))
                        }
                      />
                    </div>

                    {signUpError ? (
                      <div className="rounded-2xl border border-destructive/20 bg-destructive/6 px-4 py-3 text-sm text-destructive-foreground">
                        {signUpError}
                      </div>
                    ) : null}

                    <Button className="w-full" loading={isSigningUp} size="lg" type="submit">
                      Create student account
                      <CheckCircle2Icon />
                    </Button>
                  </form>
                </TabsContent>
              </Tabs>

              <Separator />

              <div className="rounded-2xl border border-border/60 bg-background/70 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-medium">Registration policy</p>
                    <p className="text-sm text-muted-foreground">
                      Self-service creates students only. Privileged roles are provisioned by operations.
                    </p>
                  </div>
                  <Badge
                    className={cn(
                      "rounded-full px-3",
                      mode === "sign-up" ? "bg-success/10 text-success-foreground" : "",
                    )}
                    variant={mode === "sign-up" ? "success" : "outline"}
                  >
                    Student-only
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </section>
      </div>
    </main>
  );
}
