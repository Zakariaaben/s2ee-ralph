import type React from "react";

type AuthShellProps = {
  readonly children: React.ReactNode;
};

export function AuthShell({ children }: AuthShellProps): React.ReactElement {
  return (
    <main className="min-h-[100dvh] bg-[var(--s2ee-canvas)] font-mono text-foreground">
      <div className="grid min-h-[100dvh] md:grid-cols-[minmax(320px,0.72fr)_minmax(0,1fr)]">
        <section className="s2ee-fade-up hidden flex-col justify-between border-r bg-[var(--s2ee-surface-soft)] px-8 py-10 md:flex lg:px-10 lg:py-12 [border-color:var(--s2ee-border)]">
          <div className="space-y-12">
            <div className="space-y-1">
              <p className="text-2xl font-black tracking-[-0.08em] text-primary">S2EE</p>
              <p className="text-[11px] uppercase tracking-[0.24em] text-[color:var(--s2ee-muted-foreground)]">
                16e edition
              </p>
            </div>

            <div className="space-y-8">
              <div className="space-y-5">
                <p className="text-xs font-bold uppercase tracking-[0.22em] text-[color:var(--s2ee-soft-foreground)]">
                  Acces
                </p>
                <div className="space-y-5 text-sm">
                  <div className="flex items-start gap-3">
                    <span className="s2ee-focus-marker mt-1 shrink-0" />
                    <div className="space-y-1">
                      <p className="font-bold uppercase tracking-[0.08em] text-[color:var(--s2ee-soft-foreground)]">
                        Connexion
                      </p>
                      <p className="max-w-md leading-7 text-[color:var(--s2ee-muted-foreground)]">
                        Connectez-vous pour acceder a votre espace.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <span className="s2ee-focus-marker mt-1 shrink-0" />
                    <div className="space-y-1">
                      <p className="font-bold uppercase tracking-[0.08em] text-[color:var(--s2ee-soft-foreground)]">
                        Inscription etudiante
                      </p>
                      <p className="max-w-md leading-7 text-[color:var(--s2ee-muted-foreground)]">
                        La creation de compte est reservee aux etudiants.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <span className="s2ee-focus-marker mt-1 shrink-0" />
                    <div className="space-y-1">
                      <p className="font-bold uppercase tracking-[0.08em] text-[color:var(--s2ee-soft-foreground)]">
                        Plan du salon
                      </p>
                      <p className="max-w-md leading-7 text-[color:var(--s2ee-muted-foreground)]">
                        Le plan du salon reste accessible sans connexion.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-4 border-t pt-6 [border-color:var(--s2ee-border)]">
                <p className="text-xs font-bold uppercase tracking-[0.22em] text-[color:var(--s2ee-soft-foreground)]">
                  Espaces
                </p>
                <div className="grid grid-cols-2 gap-px border bg-[var(--s2ee-border)] [border-color:var(--s2ee-border)]">
                  <div className="bg-[var(--s2ee-surface)] px-3 py-3">
                    <p className="text-[10px] uppercase tracking-[0.18em] text-[color:var(--s2ee-muted-foreground)]">
                      Etudiant
                    </p>
                    <p className="mt-2 text-[11px] font-bold uppercase tracking-[0.08em] text-primary">
                      Inscription
                    </p>
                  </div>
                  <div className="bg-[var(--s2ee-surface)] px-3 py-3">
                    <p className="text-[10px] uppercase tracking-[0.18em] text-[color:var(--s2ee-muted-foreground)]">
                      Entreprise
                    </p>
                    <p className="mt-2 text-[11px] font-bold uppercase tracking-[0.08em] text-[color:var(--s2ee-soft-foreground)]">
                      Connexion
                    </p>
                  </div>
                  <div className="bg-[var(--s2ee-surface)] px-3 py-3">
                    <p className="text-[10px] uppercase tracking-[0.18em] text-[color:var(--s2ee-muted-foreground)]">
                      Admin
                    </p>
                    <p className="mt-2 text-[11px] font-bold uppercase tracking-[0.08em] text-[color:var(--s2ee-soft-foreground)]">
                      Connexion
                    </p>
                  </div>
                  <div className="bg-[var(--s2ee-surface)] px-3 py-3">
                    <p className="text-[10px] uppercase tracking-[0.18em] text-[color:var(--s2ee-muted-foreground)]">
                      Public
                    </p>
                    <p className="mt-2 text-[11px] font-bold uppercase tracking-[0.08em] text-[color:var(--s2ee-soft-foreground)]">
                      Plan
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="s2ee-status-line px-4 py-4">
              <p className="text-[11px] leading-6 uppercase tracking-[0.16em] text-[color:var(--s2ee-soft-foreground)]">
                La creation de compte est reservee aux etudiants. Si vous avez deja un compte,
                connectez-vous.
              </p>
            </div>
            <div className="flex flex-wrap gap-x-5 gap-y-2 text-[11px] uppercase tracking-[0.2em] text-[color:var(--s2ee-soft-foreground)]">
              <a className="transition-colors hover:text-primary" href="/">
                Accueil
              </a>
              <a className="transition-colors hover:text-primary" href="/map">
                Plan du salon
              </a>
            </div>
          </div>
        </section>

        <section className="s2ee-fade-up relative flex items-center justify-center bg-[var(--s2ee-surface)] px-6 py-24 md:px-10 md:py-12">
          <div className="s2ee-terminal-grid pointer-events-none absolute inset-0 opacity-45" />
          <div className="absolute left-0 top-0 flex w-full items-center justify-between border-b bg-[var(--s2ee-surface-soft)] px-6 py-4 md:hidden [border-color:var(--s2ee-border)]">
            <p className="text-lg font-black tracking-[-0.08em] text-primary">S2EE 16e edition</p>
            <a
              className="text-[11px] uppercase tracking-[0.22em] text-[color:var(--s2ee-soft-foreground)]"
              href="/map"
            >
              Plan
            </a>
          </div>

          <div className="relative w-full max-w-md border border-[var(--s2ee-border)] bg-white px-5 py-7 sm:px-8 sm:py-9">
            {children}
          </div>
        </section>
      </div>
    </main>
  );
}
