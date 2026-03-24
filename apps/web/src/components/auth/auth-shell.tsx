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
              <p className="text-2xl font-black tracking-[-0.08em] text-primary">S2EE OS</p>
              <p className="text-[11px] uppercase tracking-[0.24em] text-[color:var(--s2ee-muted-foreground)]">
                Edition 16 // ESI employment fair
              </p>
            </div>

            <div className="space-y-8">
              <div className="space-y-5">
                <p className="text-xs font-bold uppercase tracking-[0.22em] text-[color:var(--s2ee-soft-foreground)]">
                  Access policy v1.0
                </p>
                <div className="space-y-5 text-sm">
                  <div className="flex items-start gap-3">
                    <span className="mt-1 size-2 shrink-0 rounded-full bg-primary" />
                    <div className="space-y-1">
                      <p className="font-bold uppercase tracking-[0.08em] text-[color:var(--s2ee-soft-foreground)]">
                        Single session route
                      </p>
                      <p className="max-w-md leading-7 text-[color:var(--s2ee-muted-foreground)]">
                        Successful authentication continues directly to the home route assigned to the current role.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <span className="mt-1 size-2 shrink-0 rounded-full bg-primary" />
                    <div className="space-y-1">
                      <p className="font-bold uppercase tracking-[0.08em] text-[color:var(--s2ee-soft-foreground)]">
                        Student self-service
                      </p>
                      <p className="max-w-md leading-7 text-[color:var(--s2ee-muted-foreground)]">
                        Only student accounts can be created here. Other roles remain organizer-managed.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <span className="mt-1 size-2 shrink-0 rounded-full bg-primary" />
                    <div className="space-y-1">
                      <p className="font-bold uppercase tracking-[0.08em] text-[color:var(--s2ee-soft-foreground)]">
                        Public map availability
                      </p>
                      <p className="max-w-md leading-7 text-[color:var(--s2ee-muted-foreground)]">
                        Published room pins and company placement remain visible without signing in.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-4 border-t pt-6 [border-color:var(--s2ee-border)]">
                <p className="text-xs font-bold uppercase tracking-[0.22em] text-[color:var(--s2ee-soft-foreground)]">
                  Permitted roles
                </p>
                <div className="grid grid-cols-2 gap-2">
                  <div className="border bg-[var(--s2ee-surface)] px-3 py-3 [border-color:color-mix(in_srgb,var(--s2ee-border)_65%,transparent)]">
                    <p className="text-[10px] uppercase tracking-[0.18em] text-[color:var(--s2ee-muted-foreground)]">Student</p>
                    <p className="mt-2 text-[11px] font-bold uppercase tracking-[0.08em] text-primary">Self-service sign-up</p>
                  </div>
                  <div className="border bg-[var(--s2ee-surface)] px-3 py-3 [border-color:color-mix(in_srgb,var(--s2ee-border)_65%,transparent)]">
                    <p className="text-[10px] uppercase tracking-[0.18em] text-[color:var(--s2ee-muted-foreground)]">Company</p>
                    <p className="mt-2 text-[11px] font-bold uppercase tracking-[0.08em] text-[color:var(--s2ee-soft-foreground)]">Provisioned access</p>
                  </div>
                  <div className="border bg-[var(--s2ee-surface)] px-3 py-3 [border-color:color-mix(in_srgb,var(--s2ee-border)_65%,transparent)]">
                    <p className="text-[10px] uppercase tracking-[0.18em] text-[color:var(--s2ee-muted-foreground)]">Admin</p>
                    <p className="mt-2 text-[11px] font-bold uppercase tracking-[0.08em] text-[color:var(--s2ee-soft-foreground)]">Provisioned access</p>
                  </div>
                  <div className="border bg-[var(--s2ee-surface)] px-3 py-3 [border-color:color-mix(in_srgb,var(--s2ee-border)_65%,transparent)]">
                    <p className="text-[10px] uppercase tracking-[0.18em] text-[color:var(--s2ee-muted-foreground)]">Public</p>
                    <p className="mt-2 text-[11px] font-bold uppercase tracking-[0.08em] text-[color:var(--s2ee-soft-foreground)]">Read-only map</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="border-l-2 bg-[color:color-mix(in_srgb,var(--color-primary)_6%,transparent)] px-4 py-4 [border-color:var(--color-primary)]">
              <p className="text-[11px] leading-6 uppercase tracking-[0.16em] text-[color:var(--s2ee-soft-foreground)]">
                Notice: use the sign-up route only for student account creation. Existing accounts should continue through sign in.
              </p>
            </div>
            <div className="flex flex-wrap gap-x-5 gap-y-2 text-[11px] uppercase tracking-[0.2em] text-[color:var(--s2ee-soft-foreground)]">
              <a className="transition-colors hover:text-primary" href="/">Route back to public</a>
              <a className="transition-colors hover:text-primary" href="/map">View map</a>
            </div>
          </div>
        </section>

        <section className="s2ee-fade-up relative flex flex-1 items-center justify-center bg-[var(--s2ee-surface)] px-6 py-24 md:px-10 md:py-12">
          <div className="absolute left-0 top-0 flex w-full items-center justify-between border-b bg-[var(--s2ee-surface-soft)] px-6 py-4 md:hidden [border-color:var(--s2ee-border)]">
            <p className="text-lg font-black tracking-[-0.08em] text-primary">S2EE Edition 16</p>
            <a className="text-[11px] uppercase tracking-[0.22em] text-[color:var(--s2ee-soft-foreground)]" href="/map">Map</a>
          </div>

          <div className="w-full max-w-md">{children}</div>
        </section>
      </div>
    </main>
  );
}
