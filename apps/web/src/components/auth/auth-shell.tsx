import type React from "react";

type AuthShellProps = {
  readonly children: React.ReactNode;
};

export function AuthShell({ children }: AuthShellProps): React.ReactElement {
  return (
    <main className="min-h-[100dvh] bg-[var(--s2ee-canvas)] font-mono text-foreground">
      <div className="flex min-h-[100dvh] flex-col md:flex-row">
        <section className="s2ee-fade-up hidden w-full flex-col justify-between border-r bg-[var(--s2ee-surface-soft)] px-8 py-10 md:flex md:w-2/5 lg:px-10 lg:py-12 [border-color:var(--s2ee-border)]">
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
                    <span className="mt-1 size-2 shrink-0 rounded-full bg-primary" />
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
                    <span className="mt-1 size-2 shrink-0 rounded-full bg-primary" />
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
                    <span className="mt-1 size-2 shrink-0 rounded-full bg-primary" />
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
                <div className="grid grid-cols-2 gap-2">
                  <div className="border bg-[var(--s2ee-surface)] px-3 py-3 [border-color:color-mix(in_srgb,var(--s2ee-border)_65%,transparent)]">
                    <p className="text-[10px] uppercase tracking-[0.18em] text-[color:var(--s2ee-muted-foreground)]">Etudiant</p>
                    <p className="mt-2 text-[11px] font-bold uppercase tracking-[0.08em] text-primary">Inscription</p>
                  </div>
                  <div className="border bg-[var(--s2ee-surface)] px-3 py-3 [border-color:color-mix(in_srgb,var(--s2ee-border)_65%,transparent)]">
                    <p className="text-[10px] uppercase tracking-[0.18em] text-[color:var(--s2ee-muted-foreground)]">Entreprise</p>
                    <p className="mt-2 text-[11px] font-bold uppercase tracking-[0.08em] text-[color:var(--s2ee-soft-foreground)]">Connexion</p>
                  </div>
                  <div className="border bg-[var(--s2ee-surface)] px-3 py-3 [border-color:color-mix(in_srgb,var(--s2ee-border)_65%,transparent)]">
                    <p className="text-[10px] uppercase tracking-[0.18em] text-[color:var(--s2ee-muted-foreground)]">Admin</p>
                    <p className="mt-2 text-[11px] font-bold uppercase tracking-[0.08em] text-[color:var(--s2ee-soft-foreground)]">Connexion</p>
                  </div>
                  <div className="border bg-[var(--s2ee-surface)] px-3 py-3 [border-color:color-mix(in_srgb,var(--s2ee-border)_65%,transparent)]">
                    <p className="text-[10px] uppercase tracking-[0.18em] text-[color:var(--s2ee-muted-foreground)]">Public</p>
                    <p className="mt-2 text-[11px] font-bold uppercase tracking-[0.08em] text-[color:var(--s2ee-soft-foreground)]">Plan</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="border-l-2 bg-[color:color-mix(in_srgb,var(--color-primary)_6%,transparent)] px-4 py-4 [border-color:var(--color-primary)]">
              <p className="text-[11px] leading-6 uppercase tracking-[0.16em] text-[color:var(--s2ee-soft-foreground)]">
                La creation de compte est reservee aux etudiants. Si vous avez deja un compte, connectez-vous.
              </p>
            </div>
            <div className="flex flex-wrap gap-x-5 gap-y-2 text-[11px] uppercase tracking-[0.2em] text-[color:var(--s2ee-soft-foreground)]">
              <a className="transition-colors hover:text-primary" href="/">Accueil</a>
              <a className="transition-colors hover:text-primary" href="/map">Plan du salon</a>
            </div>
          </div>
        </section>

        <section className="s2ee-fade-up relative flex flex-1 items-center justify-center bg-[var(--s2ee-surface)] px-6 py-24 md:px-10 md:py-12">
          <div className="absolute left-0 top-0 flex w-full items-center justify-between border-b bg-[var(--s2ee-surface-soft)] px-6 py-4 md:hidden [border-color:var(--s2ee-border)]">
            <p className="text-lg font-black tracking-[-0.08em] text-primary">S2EE 16e edition</p>
            <a className="text-[11px] uppercase tracking-[0.22em] text-[color:var(--s2ee-soft-foreground)]" href="/map">Plan</a>
          </div>

          <div className="w-full max-w-md">{children}</div>
        </section>
      </div>
    </main>
  );
}
