"use client";

import { useAtomValue } from "@effect/atom-react";
import * as AsyncResult from "effect/unstable/reactivity/AsyncResult";
import {
  BriefcaseBusinessIcon,
  GraduationCapIcon,
  LightbulbIcon,
  SettingsIcon,
} from "lucide-react";
import type React from "react";

import { PublicVenueMap } from "@/components/public/public-venue-map";
import { publicFeaturedCompaniesAtom } from "@/lib/public-company-atoms";

const eventFacts = [
  ["Edition", "17e"],
  ["Date", "16"],
  ["Lieu", "Ecole superieure d'informatique"],
  ["Organisateur", "ETIC Club"],
] as const;

const companyInitials = (name: string): string =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();

const offerRows = [
  { key: "employmentCount", label: "emplois", icon: BriefcaseBusinessIcon },
  { key: "workerInternshipCount", label: "stages ouvriers", icon: LightbulbIcon },
  { key: "practicalInternshipCount", label: "stages pratiques", icon: SettingsIcon },
  { key: "pfeCount", label: "PFE", icon: GraduationCapIcon },
] as const;

const countPublicCompanyOffers = (company: {
  readonly employmentCount: number;
  readonly workerInternshipCount: number;
  readonly practicalInternshipCount: number;
  readonly pfeCount: number;
}): number => offerRows.reduce((total, row) => total + company[row.key], 0);

export function PublicHome(): React.ReactElement {
  const featuredCompaniesResult = useAtomValue(publicFeaturedCompaniesAtom);
  const companyCards = AsyncResult.isSuccess(featuredCompaniesResult)
    ? featuredCompaniesResult.value
    : [];

  return (
    <main className="s2ee-public-canvas min-h-[100dvh] overflow-hidden font-mono text-foreground">
      <section className="s2ee-public-hero relative min-h-[100dvh] bg-[var(--s2ee-identity-navy)]">
        <img
          alt=""
          aria-hidden="true"
          className="s2ee-wave-field pointer-events-none absolute inset-y-0 right-[-18vw] z-0 hidden h-full w-[88vw] max-w-none object-cover opacity-85 lg:block"
          src="/brand/s2ee-wave.svg"
        />
        <div className="pointer-events-none absolute inset-0 z-0 bg-[linear-gradient(90deg,var(--s2ee-identity-navy)_0%,color-mix(in_srgb,var(--s2ee-identity-navy)_94%,transparent)_42%,color-mix(in_srgb,var(--s2ee-identity-navy)_48%,transparent)_100%)]" />

        <header className="relative z-10">
          <div className="mx-auto flex max-w-[1720px] items-center justify-between gap-6 px-5 py-5 sm:px-8 lg:px-10">
            <a className="flex items-center gap-3 text-primary" href="/">
              <span className="s2ee-small-wordmark text-2xl font-black">S2EE</span>
              <span className="hidden text-[11px] font-black uppercase tracking-[0.22em] sm:inline">
                Salon de l'emploi de l'ESI
              </span>
            </a>
            <nav className="flex items-center gap-5 md:gap-8" aria-label="Navigation publique">
              <a className="s2ee-nav-link text-primary" href="/">
                Accueil
              </a>
              <a
                className="s2ee-nav-link text-[color:var(--s2ee-muted-foreground)] transition-colors hover:text-primary"
                href="#entreprises"
              >
                Entreprises
              </a>
              <a
                className="s2ee-nav-link text-[color:var(--s2ee-muted-foreground)] transition-colors hover:text-primary"
                href="#plan"
              >
                Plan
              </a>
              <a
                className="s2ee-nav-link text-[color:var(--s2ee-muted-foreground)] transition-colors hover:text-primary"
                href="/auth/sign-in"
              >
                Connexion
              </a>
            </nav>
          </div>
        </header>

        <div className="relative z-10 mx-auto grid min-h-[calc(100dvh-72px)] max-w-[1720px] grid-rows-[1fr_auto] gap-7 px-5 pb-8 pt-4 sm:px-8 lg:px-10 lg:pb-10">
          <div className="grid content-center gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(22rem,27rem)] lg:items-center">
            <div className="max-w-5xl">
              <div className="mb-12 flex items-center gap-5">
                <p className="whitespace-nowrap text-base font-medium text-[color:var(--s2ee-identity-gray)]">
                  Edition 17
                </p>
                <div className="h-px min-w-24 flex-1 bg-[color:var(--s2ee-border-strong)]" />
              </div>

              <h1 className="s2ee-hero-title" aria-label="S2EE 17">
                <span className="sr-only">S2EE 17</span>
                <img
                  alt=""
                  aria-hidden="true"
                  className="block h-full w-full object-contain"
                  src="/brand/s2ee-17-mark.svg"
                />
              </h1>

              <p className="mt-10 max-w-2xl text-xl font-medium leading-9 text-[color:var(--s2ee-identity-gray)] sm:text-2xl sm:leading-10">
                Le Salon de l'emploi de l'Ecole superieure d'informatique, organise par ETIC Club.
              </p>
            </div>

            <aside className="s2ee-organizer-panel lg:translate-y-16">
              <div className="flex items-center justify-between gap-5">
                <p className="s2ee-index-label text-primary">Organise par</p>
                <img alt="ETIC Club" className="h-10 w-auto max-w-[7rem]" src="/etic.svg" />
              </div>
              <p className="mt-8 text-3xl font-black leading-[0.95] tracking-[-0.07em] text-[color:var(--s2ee-identity-gray)]">
                ETIC Club met en scene la rencontre entre talents et entreprises.
              </p>
              <div className="mt-8 h-px bg-[color:var(--s2ee-border-strong)]" />
              <p className="mt-5 text-sm font-medium leading-7 text-[color:var(--s2ee-muted-foreground)]">
                Une identite visuelle faite de vagues, de lignes et de points lumineux: chaque
                parcours converge vers une opportunite.
              </p>
            </aside>
          </div>

          <section className="s2ee-fact-strip">
            {eventFacts.map(([label, value]) => (
              <div className="s2ee-fact-item" key={label}>
                <p className="s2ee-index-label">{label}</p>
                <p className="mt-2 text-sm font-black uppercase tracking-[-0.02em] text-[color:var(--s2ee-identity-gray)]">
                  {value}
                </p>
              </div>
            ))}
          </section>
        </div>
      </section>

      <section className="s2ee-public-section" id="infos">
        <div className="mx-auto max-w-[1720px] px-5 py-16 sm:px-8 lg:px-10 lg:py-24">
          <div className="grid gap-10 lg:grid-cols-[0.78fr_1fr] lg:items-end">
            <div>
              <div className="mb-8 flex items-center gap-5">
                <p className="whitespace-nowrap text-base font-medium text-[color:var(--s2ee-identity-gray)]">
                  Informations
                </p>
                <div className="h-px min-w-24 flex-1 bg-[color:var(--s2ee-border-strong)]" />
              </div>
              <h2 className="text-[clamp(2.5rem,6vw,6.5rem)] font-black leading-[0.9] tracking-[-0.08em] text-[color:var(--s2ee-identity-gray)]">
                Un salon pense comme une scene.
              </h2>
            </div>
            <div className="s2ee-glass-panel p-5 sm:p-7">
              <p className="max-w-3xl text-xl font-medium leading-9 text-[color:var(--s2ee-identity-gray)]">
                Le S2EE transforme l'Ecole superieure d'informatique en espace de rencontre:
                entreprises, etudiants et organisateurs avancent dans le meme mouvement visuel.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="s2ee-public-section" id="entreprises">
        <div className="mx-auto max-w-[1720px] px-5 py-16 sm:px-8 lg:px-10 lg:py-24">
          <div className="mb-10 flex items-center gap-5">
            <p className="whitespace-nowrap text-base font-medium text-[color:var(--s2ee-identity-gray)]">
              Entreprises
            </p>
            <div className="h-px min-w-24 flex-1 bg-[color:var(--s2ee-border-strong)]" />
          </div>

          {AsyncResult.isInitial(featuredCompaniesResult) ? (
            <div className="s2ee-glass-panel p-6">
              <p className="text-sm font-black uppercase tracking-[0.18em] text-primary">
                Chargement des entreprises…
              </p>
            </div>
          ) : companyCards.length === 0 ? (
            <div className="s2ee-glass-panel p-6">
              <p className="text-lg font-medium leading-8 text-[color:var(--s2ee-identity-gray)]">
                Les entreprises seront affichees ici des qu'elles seront publiees par
                l'administration.
              </p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {companyCards.map((company) => (
                <article className="s2ee-company-card" key={company.id}>
                  <div className="s2ee-company-logo">
                    <span>{company.logoLabel || companyInitials(company.name)}</span>
                  </div>

                  <div className="s2ee-company-summary">
                    <h3>{company.name}</h3>
                    {company.description.length > 0 ? <p>{company.description}</p> : null}
                  </div>

                  {company.profiles.length > 0 ? (
                    <div className="s2ee-company-profiles">
                      <h4>Profils recherches</h4>
                      <ul>
                        {company.profiles.map((profile) => (
                          <li key={profile}>{profile}</li>
                        ))}
                      </ul>
                    </div>
                  ) : null}

                  {countPublicCompanyOffers(company) > 0 ? (
                    <div className="s2ee-company-offers">
                      {offerRows
                        .filter(({ key }) => company[key] > 0)
                        .map(({ icon: Icon, key, label }) => (
                          <div className="s2ee-company-offer-row" key={label}>
                            <Icon aria-hidden="true" className="size-6" strokeWidth={2.4} />
                            <span>
                              {company[key]} {label}
                            </span>
                          </div>
                        ))}
                    </div>
                  ) : null}
                </article>
              ))}
            </div>
          )}
        </div>
      </section>

      <section className="s2ee-public-section" id="plan">
        <div className="mx-auto max-w-[1720px] px-5 py-16 sm:px-8 lg:px-10 lg:py-24">
          <div className="mb-10 flex items-center gap-5">
            <p className="whitespace-nowrap text-base font-medium text-[color:var(--s2ee-identity-gray)]">
              Plan du salon
            </p>
            <div className="h-px min-w-24 flex-1 bg-[color:var(--s2ee-border-strong)]" />
          </div>
          <PublicVenueMap embedded />
        </div>
      </section>
    </main>
  );
}
