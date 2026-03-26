import type React from "react";

export function PublicHome(): React.ReactElement {
  return (
    <main className="s2ee-public-canvas min-h-[100dvh] font-mono text-foreground">
      <header className="flex items-center justify-between border-b bg-[var(--s2ee-surface-soft)] px-6 py-3 [border-color:var(--s2ee-border)]">
        <div className="flex items-center gap-3 font-black text-primary">
          <span className="text-lg tracking-[-0.08em]">S2EE</span>
          <span className="text-sm tracking-[-0.04em]">16e edition</span>
        </div>
        <nav className="hidden gap-8 md:flex">
          <a className="border-b-2 border-primary pb-1 text-sm font-bold uppercase tracking-[0.12em] text-primary" href="/">
            Accueil
          </a>
          <a className="text-sm uppercase tracking-[0.12em] text-[color:var(--s2ee-muted-foreground)] transition-colors hover:text-primary" href="/auth/sign-in">
            Se connecter
          </a>
          <a className="text-sm uppercase tracking-[0.12em] text-[color:var(--s2ee-muted-foreground)] transition-colors hover:text-primary" href="/map">
            Plan du salon
          </a>
        </nav>
      </header>

      <div className="flex min-h-[calc(100dvh-57px)] flex-col md:flex-row">
        <section className="flex w-full flex-col justify-center bg-[var(--s2ee-surface)] px-8 py-16 md:w-[60%] md:px-16 lg:px-20">
          <div className="mb-8 grid grid-cols-2 gap-2 md:hidden">
            <a
              className="inline-flex min-h-12 items-center justify-center border bg-[var(--s2ee-surface-soft)] px-4 py-3 text-center text-[11px] font-bold uppercase tracking-[0.16em] text-slate-900 transition-colors duration-200 ease-[cubic-bezier(0.32,0.72,0,1)] hover:bg-white [border-color:var(--s2ee-border)]"
              href="/auth/sign-in"
            >
              Se connecter
            </a>
            <a
              className="inline-flex min-h-12 items-center justify-center border bg-[var(--s2ee-surface-soft)] px-4 py-3 text-center text-[11px] font-bold uppercase tracking-[0.16em] text-slate-900 transition-colors duration-200 ease-[cubic-bezier(0.32,0.72,0,1)] hover:bg-white [border-color:var(--s2ee-border)]"
              href="/map"
            >
              Plan du salon
            </a>
          </div>

          <div className="s2ee-fade-up space-y-2">
            <h1 className="text-balance text-[clamp(3.25rem,14vw,8rem)] font-black leading-none tracking-[-0.1em] text-slate-900">
              S2EE
              <br />
              <span className="text-primary">16e EDITION</span>
            </h1>
          </div>

          <div className="s2ee-fade-up mt-10 max-w-xl">
            <p className="text-lg font-medium leading-relaxed text-[color:var(--s2ee-soft-foreground)]">
              Le salon de l&apos;emploi de l&apos;Ecole superieure d&apos;informatique.
            </p>
            <p className="mt-4 text-base leading-relaxed text-[color:var(--s2ee-muted-foreground)]">
              Consultez le plan du salon ou accedez a votre espace.
            </p>
          </div>

          <div className="s2ee-fade-up mt-12 flex flex-col gap-4 sm:flex-row">
            <a
              className="inline-flex min-h-14 items-center justify-center gap-3 bg-primary px-8 py-4 text-sm font-bold uppercase tracking-[0.18em] text-primary-foreground transition-transform duration-200 ease-[cubic-bezier(0.32,0.72,0,1)] hover:brightness-105 active:scale-[0.98] sm:min-w-56"
              href="/auth/sign-in"
            >
              Se connecter
              <span aria-hidden="true" className="text-base leading-none">
                {"->"}
              </span>
            </a>
            <a
              className="inline-flex min-h-14 items-center justify-center border bg-[var(--s2ee-surface)] px-8 py-4 text-sm font-bold uppercase tracking-[0.18em] text-slate-900 transition-colors duration-200 ease-[cubic-bezier(0.32,0.72,0,1)] hover:bg-[var(--s2ee-surface-soft)] active:scale-[0.98] [border-color:var(--s2ee-border)] sm:min-w-56"
              href="/map"
            >
              Voir le plan du salon
            </a>
          </div>

          <div className="s2ee-fade-up mt-24 grid gap-px border border-[var(--s2ee-border)] bg-[var(--s2ee-border)] sm:grid-cols-2">
            {[
              ["Date", "A venir"],
              ["Lieu", "ESI"],
              ["Entreprises", "A venir"],
              ["Plan", "Disponible"],
            ].map(([label, value]) => (
              <div className="bg-[var(--s2ee-surface)] px-5 py-5" key={label}>
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[color:var(--s2ee-muted-foreground)]">
                  {label}
                </p>
                <p className="mt-3 text-sm font-bold uppercase tracking-[0.08em] text-slate-900">
                  {value}
                </p>
              </div>
            ))}
          </div>

          <div className="s2ee-fade-up mt-6 border-l-2 bg-[color:color-mix(in_srgb,var(--color-primary)_6%,transparent)] p-5 md:hidden [border-color:var(--color-primary)]">
            <p className="text-[11px] leading-relaxed uppercase tracking-[0.16em] text-[color:var(--s2ee-soft-foreground)]">
              Le plan du salon est accessible publiquement. La creation de compte est reservee aux etudiants.
            </p>
          </div>
        </section>

        <div className="hidden w-px self-center bg-[var(--s2ee-border)] md:block md:h-[60%]" />

        <section className="hidden w-full bg-slate-50 px-8 py-12 md:block md:w-[40%] md:px-10 md:py-16">
          <div className="s2ee-fade-up mb-12">
            <p className="mb-6 text-xs font-black uppercase tracking-[0.2em] text-[color:var(--s2ee-muted-foreground)]">
              S2EE
            </p>
            <div className="space-y-0">
              <div className="flex justify-between border-b py-5 [border-color:var(--s2ee-border)]">
                <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-[color:var(--s2ee-muted-foreground)]">Etablissement</span>
                <span className="text-sm font-bold uppercase tracking-[0.08em] text-slate-900">ESI</span>
              </div>
              <div className="flex justify-between border-b py-5 [border-color:var(--s2ee-border)]">
                <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-[color:var(--s2ee-muted-foreground)]">Edition</span>
                <span className="text-sm font-bold uppercase tracking-[0.08em] text-primary">16e</span>
              </div>
              <div className="flex justify-between border-b py-5 [border-color:var(--s2ee-border)]">
                <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-[color:var(--s2ee-muted-foreground)]">Acces</span>
                <span className="text-sm font-bold uppercase tracking-[0.08em] text-slate-900">Connexion</span>
              </div>
              <div className="flex justify-between border-b py-5 [border-color:var(--s2ee-border)]">
                <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-[color:var(--s2ee-muted-foreground)]">Plan</span>
                <span className="text-sm font-bold uppercase tracking-[0.08em] text-primary">Disponible</span>
              </div>
              <div className="flex justify-between py-5">
                <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-[color:var(--s2ee-muted-foreground)]">Inscription</span>
                <span className="text-sm font-bold uppercase tracking-[0.08em] text-slate-900">Etudiants</span>
              </div>
            </div>
          </div>

          <div className="s2ee-fade-up border-l-2 bg-[color:color-mix(in_srgb,var(--color-primary)_6%,transparent)] p-6 [border-color:var(--color-primary)]">
            <p className="text-[11px] leading-relaxed uppercase tracking-[0.16em] text-[color:var(--s2ee-soft-foreground)]">
              Le plan du salon est accessible publiquement. La creation de compte est reservee aux etudiants.
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}
