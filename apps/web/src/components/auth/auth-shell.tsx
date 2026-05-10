import type React from "react";

type AuthShellProps = {
  readonly children: React.ReactNode;
};

export function AuthShell({ children }: AuthShellProps): React.ReactElement {
  return (
    <main className="min-h-[100dvh] overflow-hidden bg-[var(--s2ee-canvas)] text-foreground">
      <section className="s2ee-fade-up relative flex min-h-[100dvh] items-center justify-center px-5 py-20 sm:px-8">
        <div
          className="pointer-events-none absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: "url('/wave-bg.png')" }}
        />
        <div className="pointer-events-none absolute inset-0 bg-[color:color-mix(in_srgb,var(--s2ee-canvas)_58%,transparent)]" />
        <div className="s2ee-terminal-dots pointer-events-none absolute inset-0 opacity-15" />

        <header className="absolute left-0 top-0 w-full border-b bg-[color:color-mix(in_srgb,var(--s2ee-surface-soft)_88%,black)] px-5 py-3 sm:px-8 [border-color:var(--s2ee-border)]">
          <nav className="mx-auto flex max-w-5xl items-center justify-between gap-4">
            <a className="flex items-center gap-3" href="/">
              <img alt="ETIC Club" className="h-8 w-auto" src="/etic.svg" />
              <span className="h-6 w-px bg-[var(--s2ee-border)]" />
              <img alt="S2EE" className="h-7 w-auto" src="/s2ee.svg" />
            </a>

            <a
              className="rounded-[8px] border border-[var(--s2ee-border)] bg-[var(--s2ee-surface)] px-4 py-2 text-sm font-bold text-[color:var(--s2ee-soft-foreground)] transition-colors hover:bg-white"
              href="/"
            >
              Accueil
            </a>
          </nav>
        </header>

        <div className="s2ee-auth-panel relative w-full max-w-[42rem] rounded-[8px] border border-[var(--s2ee-border)] bg-[color:color-mix(in_srgb,var(--s2ee-surface)_88%,black)] px-5 py-7 shadow-[0_24px_80px_color-mix(in_srgb,black_32%,transparent)] sm:px-8 sm:py-9">
          {children}
        </div>
      </section>
    </main>
  );
}
