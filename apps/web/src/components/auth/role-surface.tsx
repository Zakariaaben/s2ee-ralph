"use client";

import { Badge } from "@project/ui/components/badge";
import { Button } from "@project/ui/components/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@project/ui/components/card";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@project/ui/components/empty";
import type { UserRoleValue } from "@project/domain";
import type { LucideIcon } from "lucide-react";
import {
  ArrowRightIcon,
  BriefcaseBusinessIcon,
  IdCardIcon,
  LayoutPanelTopIcon,
  LogOutIcon,
  ShieldIcon,
} from "lucide-react";
import type React from "react";
import { useEffect, useEffectEvent, useState } from "react";

import { authClient } from "@/lib/auth-client";
import { getRoleHomePath } from "@/lib/auth-routing";

type RoleSurfaceProps = {
  readonly description: string;
  readonly expectedRole: "admin" | "student" | "company" | "check-in";
  readonly icon: LucideIcon;
  readonly highlights: ReadonlyArray<string>;
  readonly kicker: string;
  readonly title: string;
};

const roleChips = {
  admin: { label: "Admin", icon: ShieldIcon },
  student: { label: "Student", icon: IdCardIcon },
  company: { label: "Company", icon: BriefcaseBusinessIcon },
  "check-in": { label: "Check-in", icon: LayoutPanelTopIcon },
} as const;

export function RoleSurface({
  description,
  expectedRole,
  icon: Icon,
  highlights,
  kicker,
  title,
}: RoleSurfaceProps): React.ReactElement {
  const session = authClient.useSession();
  const [isSigningOut, setIsSigningOut] = useState(false);

  const redirectTo = useEffectEvent((role: typeof expectedRole | undefined | null) => {
    window.location.replace(role ? getRoleHomePath(role) : "/");
  });

  const currentRole = (session.data?.user as { role?: UserRoleValue } | undefined)?.role;

  useEffect(() => {
    if (session.isPending) {
      return;
    }

    if (!currentRole) {
      redirectTo(null);
      return;
    }

    if (currentRole !== expectedRole) {
      redirectTo(currentRole);
    }
  }, [currentRole, expectedRole, redirectTo, session.isPending]);

  const handleSignOut = async () => {
    setIsSigningOut(true);

    try {
      await authClient.signOut();
      redirectTo(null);
    } finally {
      setIsSigningOut(false);
    }
  };

  const chip = roleChips[expectedRole];

  return (
    <main className="min-h-screen bg-background px-6 py-8 text-foreground sm:px-8">
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-5xl items-center">
        <Card className="w-full overflow-hidden border-border/60 bg-card/90 shadow-sm">
          <CardHeader className="gap-6 border-b border-border/60 bg-[radial-gradient(circle_at_top_left,_hsl(var(--warning)/0.12),_transparent_45%),linear-gradient(180deg,_hsl(var(--card)),_transparent)]">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="space-y-4">
                <Badge variant="outline" size="lg" className="rounded-full px-4">
                  {kicker}
                </Badge>
                <div className="space-y-2">
                  <CardTitle className="font-heading text-4xl tracking-tight">{title}</CardTitle>
                  <CardDescription className="max-w-2xl text-base">{description}</CardDescription>
                </div>
              </div>

              <Button loading={isSigningOut} variant="outline" onClick={handleSignOut}>
                Sign out
                <LogOutIcon />
              </Button>
            </div>

            <div className="flex flex-wrap gap-3">
              <Badge variant="secondary" size="lg" className="rounded-full px-4">
                <chip.icon className="size-4" />
                {chip.label} access confirmed
              </Badge>
              <Badge variant="outline" size="lg" className="rounded-full px-4">
                {getRoleHomePath(expectedRole)}
              </Badge>
            </div>
          </CardHeader>

          <CardContent className="grid gap-6 p-6 lg:grid-cols-[0.9fr_1.1fr] lg:p-8">
            <Empty className="items-start rounded-[1.75rem] border border-border/60 bg-background/80 p-6 text-left">
              <EmptyHeader className="items-start text-left">
                <EmptyMedia variant="icon" className="size-12 rounded-2xl">
                  <Icon className="size-5" />
                </EmptyMedia>
                <EmptyTitle>Starting surface is now role-aware</EmptyTitle>
                <EmptyDescription>
                  Issue `#21` establishes the real post-auth destination for this role. The deeper workflow
                  for this space lands in the next blocked slices.
                </EmptyDescription>
              </EmptyHeader>
              <EmptyContent className="items-start text-left">
                <Button variant="outline" onClick={() => redirectTo(expectedRole)}>
                  Refresh route guard
                  <ArrowRightIcon />
                </Button>
              </EmptyContent>
            </Empty>

            <div className="grid gap-4">
              {highlights.map((highlight) => (
                <Card key={highlight} className="border-border/60 bg-background/70">
                  <CardContent className="flex items-start gap-3 p-4">
                    <div className="mt-0.5 size-2.5 rounded-full bg-primary" />
                    <p className="text-sm text-muted-foreground">{highlight}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
