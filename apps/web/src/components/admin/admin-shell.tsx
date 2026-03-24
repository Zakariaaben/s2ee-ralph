"use client";

import { Button } from "@project/ui/components/button";
import { Link, Outlet, useLocation } from "@tanstack/react-router";
import { LogOutIcon } from "lucide-react";
import type React from "react";

import { useAdminSignOut } from "@/lib/admin-page-data";
import { adminSections } from "@/lib/admin-routing";

export function AdminShell(): React.ReactElement {
  const location = useLocation();
  const { isSigningOut, signOut } = useAdminSignOut();

  return (
    <main className="min-h-[100dvh] bg-[var(--s2ee-canvas)] font-mono text-[color:var(--s2ee-soft-foreground)]">
      <div className="mx-auto max-w-[1680px] px-4 py-4 sm:px-6 lg:px-8">
        <div className="border border-[var(--s2ee-border)] bg-[var(--s2ee-surface)]">
          <header className="flex flex-col gap-5 border-b border-[var(--s2ee-border)] px-5 py-5 lg:flex-row lg:items-start lg:justify-between lg:px-8 lg:py-6">
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-3">
                <span className="text-[11px] font-bold uppercase tracking-[0.24em] text-primary">
                  S2EE edition 16
                </span>
                <span className="border border-[var(--s2ee-border)] bg-[var(--s2ee-surface-soft)] px-2 py-1 text-[10px] uppercase tracking-[0.18em] text-[color:var(--s2ee-muted-foreground)]">
                  Admin
                </span>
              </div>
              <div className="space-y-1">
                <h1 className="text-2xl font-black tracking-[-0.08em] text-slate-900 sm:text-3xl">
                  Event control
                </h1>
                <p className="max-w-2xl text-sm leading-6 text-[color:var(--s2ee-muted-foreground)]">
                  Split operational pages for overview, companies, venue logistics, map publication,
                  access control, and interview review.
                </p>
              </div>
            </div>

            <Button
              disabled={isSigningOut}
              onClick={() => {
                void signOut();
              }}
              type="button"
              variant="outline"
            >
              <LogOutIcon className="size-4" />
              {isSigningOut ? "Signing out..." : "Sign out"}
            </Button>
          </header>

          <div className="grid lg:grid-cols-[260px_minmax(0,1fr)]">
            <aside className="border-b border-[var(--s2ee-border)] bg-[var(--s2ee-surface-soft)] lg:border-r lg:border-b-0">
              <nav aria-label="Admin sections" className="grid lg:min-h-[calc(100dvh-180px)]">
                {adminSections.map((section) => {
                  const isActive =
                    location.pathname === section.to ||
                    (section.id === "overview" &&
                      (location.pathname === "/admin" || location.pathname === "/admin/overview"));

                  return (
                    <Link
                      className={[
                        "border-b border-[var(--s2ee-border)] px-5 py-4 text-left transition-colors last:border-b-0 lg:px-6",
                        isActive
                          ? "bg-white text-primary"
                          : "text-[color:var(--s2ee-soft-foreground)] hover:bg-white",
                      ].join(" ")}
                      key={section.id}
                      to={section.to}
                    >
                      <div className="space-y-1">
                        <p className="text-sm font-bold uppercase tracking-[0.08em]">{section.label}</p>
                        <p className="text-[11px] leading-5 text-[color:var(--s2ee-muted-foreground)]">
                          {section.description}
                        </p>
                      </div>
                    </Link>
                  );
                })}
              </nav>
            </aside>

            <div className="bg-white">
              <div className="px-5 py-6 sm:px-6 lg:px-8 lg:py-8">
                <Outlet />
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
