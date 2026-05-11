"use client";

import { useAtomValue } from "@effect/atom-react";
import * as AsyncResult from "effect/unstable/reactivity/AsyncResult";
import { Button } from "@project/ui/components/button";
import {
  Drawer,
  DrawerDescription,
  DrawerHeader,
  DrawerPanel,
  DrawerPopup,
  DrawerTitle,
} from "@project/ui/components/drawer";
import { Input } from "@project/ui/components/input";
import { Skeleton } from "@project/ui/components/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@project/ui/components/table";
import type { Interview } from "@project/domain";
import { useNavigate } from "@tanstack/react-router";
import {
  ArrowRightIcon,
  ListFilterIcon,
  LogOutIcon,
  MenuIcon,
  ScanLineIcon,
  SearchIcon,
} from "lucide-react";
import type React from "react";
import { useDeferredValue, useState } from "react";

import { AppIslandNavbar } from "@/components/app-island-navbar";
import { authClient } from "@/lib/auth-client";
import { companyWorkspaceAtoms } from "@/lib/company-atoms";
import {
  buildCompanyInterviewListRows,
  filterCompanyInterviewListRows,
} from "@/lib/company-interviews";

type AsyncPanelState<Value> =
  | { readonly kind: "loading" }
  | { readonly kind: "failure"; readonly message: string }
  | { readonly kind: "success"; readonly value: Value };

type InterviewStatusFilter = "all" | "active" | "completed";

const toAsyncPanelState = <Value,>(
  result: AsyncResult.AsyncResult<Value, unknown>,
  failureMessage: string,
): AsyncPanelState<Value> => {
  if (AsyncResult.isInitial(result)) {
    return { kind: "loading" };
  }

  if (AsyncResult.isFailure(result)) {
    return {
      kind: "failure",
      message: failureMessage,
    };
  }

  return {
    kind: "success",
    value: result.value,
  };
};

export function CompanyInterviewsPage(): React.ReactElement {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<InterviewStatusFilter>("all");
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const deferredQuery = useDeferredValue(query);

  const activeInterviewsResult = useAtomValue(companyWorkspaceAtoms.activeInterviews);
  const completedInterviewsResult = useAtomValue(companyWorkspaceAtoms.completedInterviews);
  const activeInterviewsState = toAsyncPanelState(
    activeInterviewsResult,
    "La liste des entretiens en cours n'a pas pu etre chargee.",
  );
  const completedInterviewsState = toAsyncPanelState(
    completedInterviewsResult,
    "La liste des entretiens termines n'a pas pu etre chargee.",
  );

  if (activeInterviewsState.kind === "loading" || completedInterviewsState.kind === "loading") {
    return (
      <main className="s2ee-workspace-page">
        <div className="s2ee-workspace-wrap grid gap-4">
          <Skeleton className="h-24 rounded-[var(--s2ee-panel-radius)]" />
          <Skeleton className="h-[40rem] rounded-[var(--s2ee-panel-radius)]" />
        </div>
      </main>
    );
  }

  const allRows =
    activeInterviewsState.kind === "success" && completedInterviewsState.kind === "success"
      ? buildCompanyInterviewListRows({
          activeInterviews: activeInterviewsState.value,
          completedInterviews: completedInterviewsState.value,
        })
      : [];
  const rows = filterCompanyInterviewListRows(allRows, {
    query: deferredQuery,
    status,
  });
  const statusFilters: ReadonlyArray<{
    readonly value: InterviewStatusFilter;
    readonly label: string;
    readonly count: number;
  }> = [
    { value: "all", label: "Tous", count: allRows.length },
    {
      value: "active",
      label: "En cours",
      count: allRows.filter((row) => row.kind === "active").length,
    },
    {
      value: "completed",
      label: "Termines",
      count: allRows.filter((row) => row.kind === "completed").length,
    },
  ];

  const handleSignOut = async () => {
    setIsSigningOut(true);

    try {
      await authClient.signOut();
      await navigate({ replace: true, to: "/" });
    } finally {
      setIsSigningOut(false);
    }
  };

  return (
    <main className="s2ee-workspace-page">
      <Drawer onOpenChange={setIsDrawerOpen} open={isDrawerOpen} position="right">
        <DrawerPopup
          className="rounded-l-[var(--s2ee-panel-radius)]"
          position="right"
          showCloseButton
        >
          <DrawerHeader className="border-b border-[var(--s2ee-border)]">
            <div className="space-y-2">
              <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-primary">
                Entreprise
              </p>
              <DrawerTitle className="font-mono text-2xl font-black tracking-[-0.06em]">
                Entretiens
              </DrawerTitle>
              <DrawerDescription className="font-mono text-sm leading-6 text-[color:var(--s2ee-muted-foreground)]" />
            </div>
          </DrawerHeader>

          <DrawerPanel className="grid gap-6 overflow-y-auto">
            <div className="mt-3 grid gap-2">
              <Button
                className="s2ee-command justify-start rounded-[var(--s2ee-control-radius)]"
                onClick={() => navigate({ to: "/company" })}
                type="button"
                variant="outline"
              >
                <ScanLineIcon />
                Scan
              </Button>
              <Button
                className="s2ee-command justify-start rounded-[var(--s2ee-control-radius)]"
                onClick={() => navigate({ to: "/company/interviews" })}
                type="button"
                variant="outline"
              >
                <ArrowRightIcon />
                Entretiens
              </Button>
            </div>

            <div className="grid gap-2 border-t border-[var(--s2ee-border)] pt-6">
              <Button
                className="s2ee-command justify-start rounded-[var(--s2ee-control-radius)]"
                loading={isSigningOut}
                onClick={handleSignOut}
                type="button"
                variant="outline"
              >
                <LogOutIcon />
                Se deconnecter
              </Button>
            </div>
          </DrawerPanel>
        </DrawerPopup>
      </Drawer>

      <AppIslandNavbar
        action={
          <div className="flex items-center gap-2">
            <Button
              className="rounded-[8px] border-[var(--s2ee-border)] bg-[var(--s2ee-surface)] px-3 text-sm font-bold text-[color:var(--s2ee-soft-foreground)] shadow-none hover:bg-white sm:px-4"
              onClick={() => setIsDrawerOpen(true)}
              size="sm"
              type="button"
              variant="outline"
            >
              <MenuIcon />
              Menu
            </Button>
            <Button
              className="rounded-[8px] border-[var(--s2ee-border)] bg-[var(--s2ee-surface)] px-3 text-sm font-bold text-[color:var(--s2ee-soft-foreground)] shadow-none hover:bg-white sm:px-4"
              onClick={() => navigate({ to: "/company/interviews" })}
              size="sm"
              type="button"
              variant="outline"
            >
              <ArrowRightIcon />
              Entretiens
            </Button>
          </div>
        }
      />

      <div className="mx-auto grid max-w-5xl gap-6 px-4 py-6 sm:px-6 sm:py-8">
        <header className="s2ee-workspace-header">
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-3 text-[11px] font-black uppercase tracking-[0.22em]">
              <span className="text-primary">S2EE Entreprise</span>
              <span className="text-[color:var(--s2ee-muted-foreground)]">
                Journal des entretiens
              </span>
            </div>
            <h1 className="s2ee-workspace-title">Entretiens candidats</h1>
          </div>
        </header>

        <section className="s2ee-data-plane">
          <div className="grid gap-4 border-b border-[var(--s2ee-border)] p-4 lg:grid-cols-[minmax(0,1fr)_auto]">
            <label className="grid gap-2">
              <span className="s2ee-index-label">Recherche</span>
              <span className="relative block">
                <SearchIcon className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[color:var(--s2ee-muted-foreground)]" />
                <Input
                  className="rounded-[var(--s2ee-control-radius)] border-[var(--s2ee-border)] bg-[var(--s2ee-surface-soft)] pl-9 shadow-none"
                  onChange={(event) => {
                    const { value } = event.currentTarget;
                    setQuery(value);
                  }}
                  placeholder="Candidat, recruteur ou note"
                  value={query}
                />
              </span>
            </label>

            <div className="grid gap-2">
              <span className="s2ee-index-label flex items-center gap-2">
                <ListFilterIcon className="size-3.5 text-primary" />
                Statut
              </span>
              <div className="flex flex-wrap gap-1 rounded-[var(--s2ee-control-radius)] border border-[var(--s2ee-border)] bg-[var(--s2ee-surface-soft)] p-1">
                {statusFilters.map((filter) => (
                  <button
                    className={[
                      "min-h-10 rounded-[calc(var(--s2ee-control-radius)-0.25rem)] px-3 text-[11px] font-black uppercase tracking-[0.16em] transition-colors",
                      status === filter.value
                        ? "bg-primary text-primary-foreground"
                        : "text-[color:var(--s2ee-muted-foreground)] hover:bg-[var(--s2ee-accent-wash)] hover:text-primary",
                    ].join(" ")}
                    key={filter.value}
                    onClick={() => setStatus(filter.value)}
                    type="button"
                  >
                    {filter.label} {filter.count}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="px-4 py-3 text-[11px] font-black uppercase tracking-[0.18em]">
                  Candidat / Entretien
                </TableHead>
                <TableHead className="px-4 py-3 text-[11px] font-black uppercase tracking-[0.18em]">
                  Statut
                </TableHead>
                <TableHead className="px-4 py-3 text-[11px] font-black uppercase tracking-[0.18em]">
                  Recruteur
                </TableHead>
                <TableHead className="px-4 py-3 text-[11px] font-black uppercase tracking-[0.18em]">
                  Parcours
                </TableHead>
                <TableHead className="px-4 py-3 text-[11px] font-black uppercase tracking-[0.18em]">
                  Note
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length === 0 ? (
                <TableRow>
                  <TableCell
                    className="px-4 py-10 text-sm text-[color:var(--s2ee-muted-foreground)]"
                    colSpan={5}
                  >
                    Aucun entretien ne correspond aux filtres actuels.
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((row) => (
                  <TableRow
                    className={[
                      "group",
                      row.kind === "active"
                        ? "cursor-pointer hover:bg-[var(--s2ee-accent-wash)]"
                        : "hover:bg-[var(--s2ee-surface-soft)]",
                    ].join(" ")}
                    key={`${row.kind}:${row.id}`}
                    onClick={() =>
                      row.kind === "active"
                        ? navigate({
                            to: "/company/interviews/$interviewId",
                            params: { interviewId: row.id as Interview["id"] },
                          })
                        : undefined
                    }
                  >
                    <TableCell className="px-4 py-4 font-bold uppercase tracking-[0.12em]">
                      {row.label}
                    </TableCell>
                    <TableCell className="px-4 py-4">
                      <span
                        className={[
                          "s2ee-status-chip",
                          row.kind === "active" ? "border-primary text-primary" : "",
                        ].join(" ")}
                      >
                        {row.kind === "active" ? "En cours" : "Termine"}
                      </span>
                    </TableCell>
                    <TableCell className="px-4 py-4 text-sm text-[color:var(--s2ee-muted-foreground)]">
                      {row.recruiterName}
                    </TableCell>
                    <TableCell className="px-4 py-4 text-sm text-[color:var(--s2ee-muted-foreground)]">
                      {row.institution.length === 0
                        ? "En cours"
                        : `${row.institution} / ${row.major}`}
                    </TableCell>
                    <TableCell className="px-4 py-4 text-sm font-bold uppercase tracking-[0.12em]">
                      {row.scoreLabel}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </section>
      </div>
    </main>
  );
}
