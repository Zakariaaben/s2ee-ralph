import type React from "react";

import { AppIslandNavbar } from "@/components/app-island-navbar";

type AuthShellProps = {
  readonly children: React.ReactNode;
};

export function AuthShell({ children }: AuthShellProps): React.ReactElement {
  return (
    <main className="relative flex min-h-[100dvh] flex-col bg-[var(--s2ee-canvas)] text-foreground">
      <div
        className="pointer-events-none absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: "url('/wave-bg.png')" }}
      />
      <div className="pointer-events-none absolute inset-0 bg-[color:color-mix(in_srgb,var(--s2ee-canvas)_58%,transparent)]" />
      <div className="s2ee-terminal-dots pointer-events-none absolute inset-0 opacity-15" />

      <AppIslandNavbar
        action={
          <a
            className="rounded-[8px] border border-[var(--s2ee-border)] bg-[var(--s2ee-surface)] px-4 py-2 text-sm font-bold text-[color:var(--s2ee-soft-foreground)] transition-colors hover:bg-white"
            href="/"
          >
            Accueil
          </a>
        }
      />

      <section className="s2ee-fade-up relative z-10 flex flex-1 items-center justify-center px-5 py-8 sm:px-8">
        <div className="s2ee-auth-panel relative w-full max-w-[42rem] rounded-[8px] border border-[var(--s2ee-border)] bg-[color:color-mix(in_srgb,var(--s2ee-surface)_88%,black)] px-5 py-7 shadow-[0_24px_80px_color-mix(in_srgb,black_32%,transparent)] sm:px-8 sm:py-9">
          {children}
        </div>
      </section>
    </main>
  );
}
