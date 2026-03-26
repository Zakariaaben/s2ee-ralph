"use client";

import { useAtomRefresh, useAtomSet, useAtomValue } from "@effect/atom-react";
import * as AsyncResult from "effect/unstable/reactivity/AsyncResult";
import { Alert, AlertDescription, AlertTitle } from "@project/ui/components/alert";
import { Badge } from "@project/ui/components/badge";
import { Button } from "@project/ui/components/button";
import {
  Drawer,
  DrawerHeader,
  DrawerPanel,
  DrawerPopup,
  DrawerTitle,
} from "@project/ui/components/drawer";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@project/ui/components/empty";
import { Input } from "@project/ui/components/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@project/ui/components/select";
import { Skeleton } from "@project/ui/components/skeleton";
import { useNavigate } from "@tanstack/react-router";
import {
  BadgeCheckIcon,
  CircleAlertIcon,
  ClipboardCheckIcon,
  ListFilterIcon,
  LoaderCircleIcon,
  LogOutIcon,
  RefreshCwIcon,
  RotateCcwIcon,
  SearchIcon,
} from "lucide-react";
import type React from "react";
import { startTransition, useDeferredValue, useEffect, useRef, useState } from "react";

import { authClient } from "@/lib/auth-client";
import { checkInWorkspaceAtoms, checkInWorkspaceReactivity } from "@/lib/check-in-atoms";
import {
  filterCheckInCompanies,
  flattenCheckInCompanies,
  summarizeCheckInWorkspace,
} from "@/lib/check-in-workspace";

type AsyncPanelState<Value> =
  | { readonly kind: "loading" }
  | { readonly kind: "failure"; readonly message: string }
  | { readonly kind: "success"; readonly value: Value };

const allRoomsValue = "all";

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

const formatMutationError = (error: unknown): string => {
  if (error instanceof Error && error.message.trim().length > 0) {
    return error.message;
  }

  return "La mise a jour n'a pas pu etre effectuee. Reessayez.";
};

const arrivalFilterOptions = [
  { value: "pending", label: "En attente" },
  { value: "arrived", label: "Arrivees" },
  { value: "all", label: "Toutes" },
] as const;

const undoWindowMs = 8_000;

type ArrivalUndoState = {
  readonly companyId: string;
  readonly companyName: string;
};

export function CheckInWorkspace(): React.ReactElement {
  const navigate = useNavigate();
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const deferredSearchQuery = useDeferredValue(searchQuery);
  const [activeFilter, setActiveFilter] = useState<(typeof arrivalFilterOptions)[number]["value"]>(
    "pending",
  );
  const [activeRoomId, setActiveRoomId] = useState<string>(allRoomsValue);
  const [workspaceMessage, setWorkspaceMessage] = useState<string | null>(null);
  const [workspaceError, setWorkspaceError] = useState<string | null>(null);
  const [pendingCompanyId, setPendingCompanyId] = useState<string | null>(null);
  const [pendingUndoCompanyId, setPendingUndoCompanyId] = useState<string | null>(null);
  const [arrivalUndoState, setArrivalUndoState] = useState<ArrivalUndoState | null>(null);
  const [isMobileFiltersOpen, setIsMobileFiltersOpen] = useState(false);
  const undoTimeoutRef = useRef<ReturnType<typeof globalThis.setTimeout> | null>(null);

  const venueRoomsResult = useAtomValue(checkInWorkspaceAtoms.venueRooms);
  const refreshVenueRooms = useAtomRefresh(checkInWorkspaceAtoms.venueRooms);
  const markCompanyArrived = useAtomSet(checkInWorkspaceAtoms.markCompanyArrived, {
    mode: "promise",
  });
  const resetCompanyArrival = useAtomSet(checkInWorkspaceAtoms.resetCompanyArrival, {
    mode: "promise",
  });

  const handleSignOut = async () => {
    setIsSigningOut(true);

    try {
      await authClient.signOut();
      await navigate({ replace: true, to: "/" });
    } finally {
      setIsSigningOut(false);
    }
  };

  const venueRoomsState = toAsyncPanelState(
    venueRoomsResult,
    "La liste des arrivees n'a pas pu etre chargee.",
  );

  const venueRooms = venueRoomsState.kind === "success" ? venueRoomsState.value : [];
  const summary = summarizeCheckInWorkspace(venueRooms);
  const companies = flattenCheckInCompanies(venueRooms);
  const roomOptions = [...venueRooms].sort((left, right) => left.code.localeCompare(right.code));
  const selectedRoom =
    activeRoomId === allRoomsValue
      ? null
      : roomOptions.find((room) => room.id === activeRoomId) ?? null;
  const visibleCompanies = filterCheckInCompanies(companies, {
    query: deferredSearchQuery,
    roomId: selectedRoom?.id ?? null,
    status: activeFilter,
  });
  const visiblePendingCount = visibleCompanies.filter((company) => company.arrivalStatus === "not-arrived").length;
  const visibleArrivedCount = visibleCompanies.length - visiblePendingCount;

  useEffect(() => {
    if (
      activeRoomId !== allRoomsValue &&
      venueRoomsState.kind === "success" &&
      !venueRooms.some((room) => room.id === activeRoomId)
    ) {
      setActiveRoomId(allRoomsValue);
    }
  }, [activeRoomId, venueRooms, venueRoomsState.kind]);

  useEffect(() => {
    if (undoTimeoutRef.current != null) {
      clearTimeout(undoTimeoutRef.current);
      undoTimeoutRef.current = null;
    }

    if (arrivalUndoState == null) {
      return;
    }

    undoTimeoutRef.current = globalThis.setTimeout(() => {
      setArrivalUndoState(null);
    }, undoWindowMs);

    return () => {
      if (undoTimeoutRef.current != null) {
        clearTimeout(undoTimeoutRef.current);
        undoTimeoutRef.current = null;
      }
    };
  }, [arrivalUndoState]);

  const refreshWorkspace = () => {
    refreshVenueRooms();
  };

  const submitArrival = async (companyId: string, companyName: string) => {
    setPendingCompanyId(companyId);
    setWorkspaceError(null);
    setWorkspaceMessage(null);
    setArrivalUndoState(null);

    try {
      await markCompanyArrived({
        payload: { companyId },
        reactivityKeys: checkInWorkspaceReactivity.venueRooms,
      });
      startTransition(() => {
        setArrivalUndoState({
          companyId,
          companyName,
        });
      });
    } catch (error) {
      setWorkspaceError(formatMutationError(error));
    } finally {
      setPendingCompanyId(null);
    }
  };

  const undoArrival = async () => {
    if (arrivalUndoState == null) {
      return;
    }

    setPendingUndoCompanyId(arrivalUndoState.companyId);
    setWorkspaceError(null);
    setWorkspaceMessage(null);

    try {
      await resetCompanyArrival({
        payload: {
          companyId: arrivalUndoState.companyId,
        },
        reactivityKeys: checkInWorkspaceReactivity.venueRooms,
      });
      startTransition(() => {
        setWorkspaceMessage(`${arrivalUndoState.companyName} remise en attente.`);
        setArrivalUndoState(null);
      });
    } catch (error) {
      setWorkspaceError(formatMutationError(error));
    } finally {
      setPendingUndoCompanyId(null);
    }
  };

  return (
    <main className="min-h-[100dvh] bg-[var(--s2ee-canvas)] font-mono text-[color:var(--s2ee-soft-foreground)]">
      <div className="mx-auto grid w-full max-w-[1480px] gap-6 px-5 py-6 sm:px-8 sm:py-8">
        <header className="grid gap-5 border-b border-[var(--s2ee-border)] pb-6 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
          <div className="space-y-3">
            <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-[color:var(--s2ee-muted-foreground)]">
              Accueil
            </p>
            <div className="space-y-2">
              <h1 className="text-3xl font-black tracking-[-0.08em] text-slate-900 sm:text-4xl">
                Arrivees
              </h1>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Button className="rounded-none" onClick={refreshWorkspace} type="button" variant="outline">
              <RefreshCwIcon className="size-4" />
              Actualiser
            </Button>
            <Button
              className="rounded-none"
              disabled={isSigningOut}
              onClick={() => {
                void handleSignOut();
              }}
              type="button"
              variant="outline"
            >
              <LogOutIcon className="size-4" />
              Se deconnecter
            </Button>
          </div>
        </header>

        {arrivalUndoState ? (
          <Alert className="sticky top-4 z-20 border-[var(--s2ee-border)] bg-[var(--s2ee-surface)]">
            <BadgeCheckIcon className="size-4" />
            <AlertTitle>Arrivee mise a jour</AlertTitle>
            <AlertDescription className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <span>{arrivalUndoState.companyName} marquee comme arrivee.</span>
              <Button
                className="rounded-none sm:min-w-32"
                disabled={pendingUndoCompanyId === arrivalUndoState.companyId}
                onClick={() => {
                  void undoArrival();
                }}
                type="button"
                variant="outline"
              >
                <RotateCcwIcon className="size-4" />
                {pendingUndoCompanyId === arrivalUndoState.companyId ? "Annulation..." : "Annuler"}
              </Button>
            </AlertDescription>
          </Alert>
        ) : null}

        {workspaceMessage ? (
          <Alert>
            <BadgeCheckIcon className="size-4" />
            <AlertTitle>Arrivee mise a jour</AlertTitle>
            <AlertDescription>{workspaceMessage}</AlertDescription>
          </Alert>
        ) : null}

        {workspaceError ? (
          <Alert variant="error">
          <CircleAlertIcon className="size-4" />
          <AlertTitle>Echec de mise a jour</AlertTitle>
          <AlertDescription>{workspaceError}</AlertDescription>
        </Alert>
        ) : null}

        <div className="grid gap-6 xl:grid-cols-[320px_minmax(0,1fr)]">
          <section className="hidden border border-[var(--s2ee-border)] bg-[var(--s2ee-surface)] xl:block">
            <div className="border-b border-[var(--s2ee-border)] px-6 py-6">
              <p className="text-[11px] uppercase tracking-[0.22em] text-[color:var(--s2ee-muted-foreground)]">
                Filtres
              </p>
              <div className="mt-3 space-y-2">
                <h2 className="text-xl font-bold tracking-[-0.06em] text-slate-900">Recherche</h2>
              </div>
            </div>

            <div className="grid gap-6 px-6 py-6">
              <div className="grid gap-2">
                <label
                  className="text-[11px] font-bold uppercase tracking-[0.18em] text-[color:var(--s2ee-muted-foreground)]"
                  htmlFor="check-in-search"
                >
                  Recherche
                </label>
                <div className="relative">
                  <SearchIcon className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[color:var(--s2ee-muted-foreground)]" />
                  <Input
                    autoComplete="off"
                    className="rounded-none border-[var(--s2ee-border)] bg-[var(--s2ee-surface-soft)] pl-9 shadow-none"
                    id="check-in-search"
                    name="check-in-search"
                    onChange={(event) => {
                      setSearchQuery(event.target.value);
                    }}
                    placeholder="Entreprise, salle ou stand"
                    value={searchQuery}
                  />
                </div>
              </div>

              <div className="grid gap-2">
                <label className="text-[11px] font-bold uppercase tracking-[0.18em] text-[color:var(--s2ee-muted-foreground)]">
                  Salle
                </label>
                <Select
                  onValueChange={(value) => {
                    setActiveRoomId(value ?? allRoomsValue);
                  }}
                  value={activeRoomId}
                >
                  <SelectTrigger className="rounded-none border-[var(--s2ee-border)] bg-[var(--s2ee-surface-soft)] shadow-none">
                    <SelectValue placeholder="Toutes les salles" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={allRoomsValue}>Toutes les salles</SelectItem>
                    {roomOptions.map((room) => (
                      <SelectItem key={room.id} value={room.id}>
                        {room.code} ({room.companies.length})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-3">
                <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[color:var(--s2ee-muted-foreground)]">
                  Statut
                </p>
                <div className="grid grid-cols-3 gap-2">
                  {arrivalFilterOptions.map((option) => (
                    <Button
                      className="rounded-none"
                      key={option.value}
                      onClick={() => {
                        setActiveFilter(option.value);
                      }}
                      type="button"
                      variant={activeFilter === option.value ? "default" : "outline"}
                    >
                      {option.label}
                    </Button>
                  ))}
                </div>
              </div>

              <div className="grid gap-3 border-t border-[var(--s2ee-border)] pt-5 text-sm">
                <div className="flex items-center justify-between gap-4">
                  <span className="text-[color:var(--s2ee-muted-foreground)]">Entreprises placees</span>
                  <span className="font-bold text-slate-900">{summary.placedCompanyCount}</span>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <span className="text-[color:var(--s2ee-muted-foreground)]">Resultats visibles</span>
                  <span className="font-bold text-slate-900">{visibleCompanies.length}</span>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <span className="text-[color:var(--s2ee-muted-foreground)]">En attente</span>
                  <span className="font-bold text-slate-900">{visiblePendingCount}</span>
                </div>
              </div>
            </div>
          </section>

          <section className="border border-[var(--s2ee-border)] bg-[var(--s2ee-surface)]">
            <div className="grid gap-3 border-b border-[var(--s2ee-border)] px-5 py-5 xl:hidden">
              <div className="relative">
                <SearchIcon className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[color:var(--s2ee-muted-foreground)]" />
                <Input
                  autoComplete="off"
                  className="rounded-none border-[var(--s2ee-border)] bg-[var(--s2ee-surface-soft)] pl-9 shadow-none"
                  id="check-in-search-mobile"
                  name="check-in-search-mobile"
                  onChange={(event) => {
                    setSearchQuery(event.target.value);
                  }}
                  placeholder="Entreprise, salle ou stand"
                  value={searchQuery}
                />
              </div>
              <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-2">
                <Button
                  className="rounded-none"
                  onClick={() => setIsMobileFiltersOpen(true)}
                  type="button"
                  variant="outline"
                >
                  <ListFilterIcon className="size-4" />
                  {selectedRoom == null ? "Filtres" : `Salle ${selectedRoom.code}`}
                </Button>
                <Button className="rounded-none" onClick={refreshWorkspace} type="button" variant="outline">
                  <RefreshCwIcon className="size-4" />
                  Actualiser
                </Button>
              </div>
              <div className="flex flex-wrap gap-3 text-[11px] font-bold uppercase tracking-[0.18em] text-[color:var(--s2ee-muted-foreground)]">
                <span>{visibleCompanies.length} resultats</span>
                <span>{visiblePendingCount} en attente</span>
                <span>{visibleArrivedCount} arrivees</span>
              </div>
            </div>

            <div className="flex flex-col gap-4 border-b border-[var(--s2ee-border)] px-6 py-6 sm:flex-row sm:items-end sm:justify-between">
              <div className="space-y-2">
                <p className="text-[11px] uppercase tracking-[0.22em] text-[color:var(--s2ee-muted-foreground)]">
                  Liste
                </p>
                <div className="space-y-1">
                  <h2 className="text-2xl font-black tracking-[-0.08em] text-slate-900">
                    {selectedRoom == null ? "Toutes les salles" : `Salle ${selectedRoom.code}`}
                  </h2>
                  <p className="max-w-3xl text-sm leading-6 text-[color:var(--s2ee-muted-foreground)]">
                    {summary.placedCompanyCount === 0
                      ? "Aucune entreprise placee pour le moment."
                      : `${visibleCompanies.length} entreprises correspondent aux filtres actuels.`}
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 text-[11px] font-bold uppercase tracking-[0.18em] text-[color:var(--s2ee-muted-foreground)]">
                <span>{visiblePendingCount} en attente</span>
                <span className="text-[var(--s2ee-border-strong)]">/</span>
                <span>{visibleArrivedCount} arrivees</span>
              </div>
            </div>

            <div className="border-b border-[var(--s2ee-border)] bg-[var(--s2ee-surface-soft)] px-6 py-4 text-sm text-[color:var(--s2ee-muted-foreground)]">
              {selectedRoom == null
                ? summary.nextArrivalLabel
                : `Salle ${selectedRoom.code}`}
            </div>

            <div className="divide-y divide-[var(--s2ee-border)]">
              {venueRoomsState.kind === "loading" ? (
                <div className="grid gap-3 p-6">
                  <Skeleton className="h-28 rounded-none" />
                  <Skeleton className="h-28 rounded-none" />
                  <Skeleton className="h-28 rounded-none" />
                </div>
              ) : null}

              {venueRoomsState.kind === "failure" ? (
                <div className="p-6">
                  <Empty className="items-start text-left">
                    <EmptyHeader className="items-start text-left">
                      <EmptyMedia className="rounded-none" variant="icon">
                        <CircleAlertIcon className="size-5" />
                      </EmptyMedia>
                      <EmptyTitle>Liste indisponible</EmptyTitle>
                      <EmptyDescription>{venueRoomsState.message}</EmptyDescription>
                    </EmptyHeader>
                    <EmptyContent>
                      <Button className="rounded-none" onClick={refreshWorkspace} type="button" variant="outline">
                        <RefreshCwIcon className="size-4" />
                        Reessayer
                      </Button>
                    </EmptyContent>
                  </Empty>
                </div>
              ) : null}

              {venueRoomsState.kind === "success" && companies.length === 0 ? (
                <div className="p-6">
                  <Empty className="items-start text-left">
                    <EmptyHeader className="items-start text-left">
                      <EmptyTitle>Aucune entreprise placee</EmptyTitle>
                      <EmptyDescription>
                        Les entreprises apparaitront ici une fois placees.
                      </EmptyDescription>
                    </EmptyHeader>
                  </Empty>
                </div>
              ) : null}

              {venueRoomsState.kind === "success" &&
              companies.length > 0 &&
              visibleCompanies.length === 0 ? (
                <div className="p-6">
                  <Empty className="items-start text-left">
                    <EmptyHeader className="items-start text-left">
                      <EmptyMedia className="rounded-none" variant="icon">
                        <SearchIcon className="size-5" />
                      </EmptyMedia>
                      <EmptyTitle>Aucune entreprise ne correspond</EmptyTitle>
                      <EmptyDescription>
                        Modifiez la recherche ou les filtres.
                      </EmptyDescription>
                    </EmptyHeader>
                  </Empty>
                </div>
              ) : null}

              {venueRoomsState.kind === "success"
                ? visibleCompanies.map((company) => {
                    const isPendingAction = pendingCompanyId === company.companyId;
                    const isArrived = company.arrivalStatus === "arrived";

                    return (
                      <article
                        className="grid gap-4 px-6 py-5 [content-visibility:auto] [contain-intrinsic-size:180px] lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center"
                        key={company.companyId}
                      >
                        <div className="grid gap-3">
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge className="rounded-none" variant={isArrived ? "secondary" : "default"}>
                            {isArrived ? "Arrivee" : "En attente"}
                          </Badge>
                            <Badge className="rounded-none" variant="outline">
                              Salle {company.roomCode}
                            </Badge>
                            <Badge className="rounded-none" variant="outline">
                              Stand {company.standNumber}
                            </Badge>
                          </div>
                          <div className="space-y-1">
                            <h3 className="text-lg font-bold tracking-[-0.05em] text-slate-900">
                              {company.companyName}
                            </h3>
                            <p className="text-sm text-[color:var(--s2ee-muted-foreground)]">
                              Salle {company.roomCode} · stand {company.standNumber}
                            </p>
                          </div>
                        </div>

                        <Button
                          className="rounded-none"
                          disabled={isArrived || isPendingAction}
                          onClick={() => {
                            void submitArrival(company.companyId, company.companyName);
                          }}
                          type="button"
                        >
                          {isPendingAction ? (
                            <>
                              <LoaderCircleIcon className="size-4 animate-spin" />
                              Enregistrement
                            </>
                          ) : isArrived ? (
                            <>
                              <BadgeCheckIcon className="size-4" />
                              Deja arrivee
                            </>
                          ) : (
                            <>
                              <ClipboardCheckIcon className="size-4" />
                              Marquer l'arrivee
                            </>
                          )}
                        </Button>
                      </article>
                    );
                  })
                : null}
            </div>
          </section>
        </div>
      </div>

      <Drawer onOpenChange={setIsMobileFiltersOpen} open={isMobileFiltersOpen} position="bottom">
        <DrawerPopup
          className="max-h-[85dvh] border bg-[var(--s2ee-surface)] p-0 font-mono [border-color:var(--s2ee-border)] xl:hidden"
          showBar
        >
          <DrawerHeader className="border-b bg-[var(--s2ee-surface-soft)] px-5 py-5 [border-color:var(--s2ee-border)]">
            <DrawerTitle className="text-xl font-black tracking-[-0.06em] text-slate-900">
              Filtres
            </DrawerTitle>
          </DrawerHeader>
          <DrawerPanel className="grid gap-6 px-5 py-5">
            <div className="grid gap-2">
              <label className="text-[11px] font-bold uppercase tracking-[0.18em] text-[color:var(--s2ee-muted-foreground)]">
                Salle
              </label>
              <Select
                onValueChange={(value) => {
                  setActiveRoomId(value ?? allRoomsValue);
                }}
                value={activeRoomId}
              >
                <SelectTrigger className="rounded-none border-[var(--s2ee-border)] bg-[var(--s2ee-surface-soft)] shadow-none">
                  <SelectValue placeholder="Toutes les salles" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={allRoomsValue}>Toutes les salles</SelectItem>
                  {roomOptions.map((room) => (
                    <SelectItem key={room.id} value={room.id}>
                      {room.code} ({room.companies.length})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-3">
              <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[color:var(--s2ee-muted-foreground)]">
                Statut
              </p>
              <div className="grid grid-cols-3 gap-2">
                {arrivalFilterOptions.map((option) => (
                  <Button
                    className="rounded-none"
                    key={option.value}
                    onClick={() => {
                      setActiveFilter(option.value);
                    }}
                    type="button"
                    variant={activeFilter === option.value ? "default" : "outline"}
                  >
                    {option.label}
                  </Button>
                ))}
              </div>
            </div>

            <div className="grid gap-3 border-t border-[var(--s2ee-border)] pt-5 text-sm">
              <div className="flex items-center justify-between gap-4">
                <span className="text-[color:var(--s2ee-muted-foreground)]">Entreprises placees</span>
                <span className="font-bold text-slate-900">{summary.placedCompanyCount}</span>
              </div>
              <div className="flex items-center justify-between gap-4">
                <span className="text-[color:var(--s2ee-muted-foreground)]">Resultats visibles</span>
                <span className="font-bold text-slate-900">{visibleCompanies.length}</span>
              </div>
              <div className="flex items-center justify-between gap-4">
                <span className="text-[color:var(--s2ee-muted-foreground)]">En attente</span>
                <span className="font-bold text-slate-900">{visiblePendingCount}</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 border-t border-[var(--s2ee-border)] pt-5">
              <Button
                className="rounded-none"
                onClick={() => {
                  setActiveRoomId(allRoomsValue);
                  setActiveFilter("pending");
                  setIsMobileFiltersOpen(false);
                }}
                type="button"
                variant="outline"
              >
                Reinitialiser
              </Button>
              <Button
                className="rounded-none"
                onClick={() => {
                  setIsMobileFiltersOpen(false);
                }}
                type="button"
              >
                Voir la liste
              </Button>
            </div>
          </DrawerPanel>
        </DrawerPopup>
      </Drawer>
    </main>
  );
}
