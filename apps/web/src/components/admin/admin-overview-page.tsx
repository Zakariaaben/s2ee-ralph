"use client";

import { Alert, AlertDescription, AlertTitle } from "@project/ui/components/alert";
import { Button } from "@project/ui/components/button";
import { BadgeCheckIcon, CircleAlertIcon, RefreshCwIcon } from "lucide-react";
import type React from "react";

import {
  AdminFailurePanel,
  AdminLoadingPanel,
  AdminPageHeader,
} from "@/components/admin/admin-page-primitives";
import {
  useAdminOverviewData,
  useRefreshAdminOverview,
} from "@/lib/admin-page-data";
import { adminSections } from "@/lib/admin-routing";
import { Link } from "@tanstack/react-router";

export function AdminOverviewPage(): React.ReactElement {
  const refreshOverview = useRefreshAdminOverview();
  const {
    accessLedgerState,
    companyLedgerState,
    interviewLedgerState,
    recentInterviews,
    summary,
  } = useAdminOverviewData();

  const errors = [
    companyLedgerState.kind === "failure" ? companyLedgerState.message : null,
    accessLedgerState.kind === "failure" ? accessLedgerState.message : null,
    interviewLedgerState.kind === "failure" ? interviewLedgerState.message : null,
  ].filter((value): value is string => value != null);

  const overviewCards = [
    {
      label: "Entreprises placees",
      value: `${summary.placedCompanyCount}`,
      detail: `/ ${summary.companyCount}`,
    },
    {
      label: "Arrivees en attente",
      value: `${summary.pendingArrivalCount}`,
      detail: "entreprises placees",
    },
    {
      label: "Entretiens",
      value: `${summary.interviewCount}`,
      detail: `${summary.completedInterviewCount} termines`,
    },
    {
      label: "Acces",
      value: `${summary.accessEntryCount}`,
      detail: `${summary.adminCount} admin`,
    },
  ];

  return (
    <div className="space-y-8">
      <AdminPageHeader
        actions={
          <Button onClick={refreshOverview} type="button" variant="outline">
            <RefreshCwIcon className="size-4" />
            Actualiser
          </Button>
        }
        description=""
        eyebrow="Admin"
        title="Apercu"
      />

      {errors.length > 0 ? (
        <Alert variant="error">
          <CircleAlertIcon className="size-4" />
          <AlertTitle>Donnees indisponibles</AlertTitle>
          <AlertDescription>{errors.join(" ")}</AlertDescription>
        </Alert>
      ) : null}

      <section className="grid gap-px border border-[var(--s2ee-border)] bg-[var(--s2ee-border)] lg:grid-cols-4">
        {(companyLedgerState.kind === "loading" ||
          accessLedgerState.kind === "loading" ||
          interviewLedgerState.kind === "loading") &&
        summary.companyCount === 0 &&
        summary.interviewCount === 0 &&
        summary.accessEntryCount === 0 ? (
          <div className="grid gap-px bg-white lg:col-span-4 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <div className="bg-white p-5" key={index}>
                <AdminLoadingPanel />
              </div>
            ))}
          </div>
        ) : (
          overviewCards.map((card) => (
            <div className="bg-white p-5" key={card.label}>
              <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-[color:var(--s2ee-muted-foreground)]">
                {card.label}
              </p>
              <div className="mt-4 flex items-end gap-3">
                <span className="text-4xl font-black tracking-[-0.08em] text-slate-900">
                  {card.value}
                </span>
                <span className="pb-1 text-[11px] uppercase tracking-[0.18em] text-[color:var(--s2ee-muted-foreground)]">
                  {card.detail}
                </span>
              </div>
            </div>
          ))
        )}
      </section>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_420px]">
        <div className="space-y-6">
          <div className="border border-[var(--s2ee-border)] bg-[var(--s2ee-surface-soft)] p-5">
            <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-primary">
              A suivre
            </p>
            <p className="mt-3 max-w-3xl text-base leading-7 text-[color:var(--s2ee-soft-foreground)]">
              {summary.nextOperationalLabel}
            </p>
          </div>

          <section className="grid gap-px border border-[var(--s2ee-border)] bg-[var(--s2ee-border)] md:grid-cols-2">
            {adminSections
              .filter((section) => section.id !== "overview")
              .map((section) => (
                <Link className="bg-white p-5 transition-colors hover:bg-[var(--s2ee-surface-soft)]" key={section.id} to={section.to}>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between gap-4">
                        <p className="text-sm font-bold uppercase tracking-[0.1em] text-slate-900">
                          {section.label}
                        </p>
                        <span className="text-[11px] uppercase tracking-[0.18em] text-primary">
                          Ouvrir
                        </span>
                    </div>
                    <p className="text-sm leading-6 text-[color:var(--s2ee-muted-foreground)]">
                      {section.description}
                    </p>
                  </div>
                </Link>
              ))}
          </section>
        </div>

        <section className="space-y-6">
          <div className="border border-[var(--s2ee-border)] bg-white p-5">
            <div className="space-y-2 border-b border-[var(--s2ee-border)] pb-4">
              <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-[color:var(--s2ee-muted-foreground)]">
                Role coverage
                Repartition des roles
              </p>
            </div>
            <div className="mt-4 grid gap-3">
              {[
                ["Admin", summary.adminCount],
                ["Entreprise", summary.companyAccountCount],
                ["Accueil", summary.checkInCount],
                ["Etudiant", summary.studentCount],
              ].map(([label, value]) => (
                <div className="flex items-center justify-between border-b border-[var(--s2ee-border)] pb-3 last:border-b-0 last:pb-0" key={label}>
                  <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-[color:var(--s2ee-muted-foreground)]">
                    {label}
                  </span>
                  <span className="text-xl font-black tracking-[-0.06em] text-slate-900">
                    {value}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="border border-[var(--s2ee-border)] bg-white p-5">
            <div className="space-y-2 border-b border-[var(--s2ee-border)] pb-4">
              <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-[color:var(--s2ee-muted-foreground)]">
                Entretiens recents
              </p>
            </div>

            <div className="mt-4 space-y-4">
              {interviewLedgerState.kind === "loading" ? <AdminLoadingPanel /> : null}
              {interviewLedgerState.kind === "failure" ? (
                <AdminFailurePanel
                  description={interviewLedgerState.message}
                  title="Entretiens indisponibles"
                />
              ) : null}
              {interviewLedgerState.kind === "success" && recentInterviews.length === 0 ? (
                <div className="border border-dashed border-[var(--s2ee-border)] p-5 text-sm leading-6 text-[color:var(--s2ee-muted-foreground)]">
                  Aucun entretien pour le moment.
                </div>
              ) : null}
              {interviewLedgerState.kind === "success" && recentInterviews.length > 0 ? (
                <div className="space-y-3">
                  {recentInterviews.map((entry) => (
                    <div className="border-b border-[var(--s2ee-border)] pb-3 last:border-b-0 last:pb-0" key={entry.interview.id}>
                      <div className="flex items-start justify-between gap-4">
                        <div className="space-y-1">
                          <p className="text-sm font-bold uppercase tracking-[0.08em] text-slate-900">
                            {entry.company.name}
                          </p>
                          <p className="text-sm leading-6 text-[color:var(--s2ee-muted-foreground)]">
                            {entry.student.firstName} {entry.student.lastName} ·{" "}
                            {entry.interview.recruiterName}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[color:var(--s2ee-muted-foreground)]">
                            {entry.interview.status}
                          </p>
                          <p className="mt-1 text-sm font-medium text-slate-900">
                            {entry.interview.score == null
                              ? "Sans note"
                              : `${entry.interview.score.toFixed(1)} / 5`}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
          </div>
        </section>
      </section>

      {errors.length === 0 ? (
        <Alert>
          <BadgeCheckIcon className="size-4" />
          <AlertTitle>Organisation des espaces admin</AlertTitle>
          <AlertDescription>
            Chaque espace dispose maintenant de sa propre page.
          </AlertDescription>
        </Alert>
      ) : null}
    </div>
  );
}
