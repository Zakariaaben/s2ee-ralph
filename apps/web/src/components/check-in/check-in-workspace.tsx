"use client";

import { useAtomRefresh, useAtomSet, useAtomValue } from "@effect/atom-react";
import * as AsyncResult from "effect/unstable/reactivity/AsyncResult";
import { Alert, AlertDescription, AlertTitle } from "@project/ui/components/alert";
import { Badge } from "@project/ui/components/badge";
import { Button } from "@project/ui/components/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@project/ui/components/card";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@project/ui/components/empty";
import { Input } from "@project/ui/components/input";
import { Separator } from "@project/ui/components/separator";
import { Skeleton } from "@project/ui/components/skeleton";
import { useNavigate } from "@tanstack/react-router";
import {
  BadgeCheckIcon,
  Building2Icon,
  CircleAlertIcon,
  ClipboardCheckIcon,
  LoaderCircleIcon,
  LogOutIcon,
  RefreshCwIcon,
  SearchIcon,
} from "lucide-react";
import type React from "react";
import {
  startTransition,
  useState,
} from "react";

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

  return "The company arrival update did not complete. Refresh the surface and try again.";
};

const arrivalFilterOptions = [
  { value: "pending", label: "Pending" },
  { value: "arrived", label: "Arrived" },
  { value: "all", label: "All" },
] as const;

export function CheckInWorkspace(): React.ReactElement {
  const navigate = useNavigate();
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState<(typeof arrivalFilterOptions)[number]["value"]>(
    "pending",
  );
  const [workspaceMessage, setWorkspaceMessage] = useState<string | null>(null);
  const [workspaceError, setWorkspaceError] = useState<string | null>(null);
  const [pendingCompanyId, setPendingCompanyId] = useState<string | null>(null);

  const venueRoomsResult = useAtomValue(checkInWorkspaceAtoms.venueRooms);
  const refreshVenueRooms = useAtomRefresh(checkInWorkspaceAtoms.venueRooms);
  const markCompanyArrived = useAtomSet(checkInWorkspaceAtoms.markCompanyArrived, {
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
    "The venue placement board could not be loaded from the venue contract.",
  );

  const venueRooms = venueRoomsState.kind === "success" ? venueRoomsState.value : [];
  const summary = summarizeCheckInWorkspace(venueRooms);
  const companies = flattenCheckInCompanies(venueRooms);
  const visibleCompanies = filterCheckInCompanies(companies, {
    query: searchQuery,
    status: activeFilter,
  });

  const refreshWorkspace = () => {
    refreshVenueRooms();
  };

  const submitArrival = async (companyId: string, companyName: string) => {
    setPendingCompanyId(companyId);
    setWorkspaceError(null);
    setWorkspaceMessage(null);

    try {
      await markCompanyArrived({
        payload: { companyId },
        reactivityKeys: checkInWorkspaceReactivity.venueRooms,
      });
      startTransition(() => {
        setWorkspaceMessage(`${companyName} marked as arrived.`);
      });
    } catch (error) {
      setWorkspaceError(formatMutationError(error));
    } finally {
      setPendingCompanyId(null);
    }
  };

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_hsl(var(--primary)/0.14),_transparent_42%),linear-gradient(180deg,_hsl(var(--background)),_hsl(var(--muted)/0.55))]">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
        <section className="overflow-hidden rounded-3xl border bg-card/95 shadow-sm backdrop-blur">
          <div className="flex flex-col gap-6 p-5 sm:p-6 lg:flex-row lg:items-end lg:justify-between lg:p-8">
            <div className="max-w-3xl space-y-4">
              <Badge className="w-fit gap-2 bg-primary/10 text-primary hover:bg-primary/10">
                <ClipboardCheckIcon className="size-3.5" />
                Check-in operations
              </Badge>
              <div className="space-y-2">
                <h1 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
                  Arrival board for event staff
                </h1>
                <p className="max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base">
                  Keep the arrival flow narrow: find a placed company, confirm its booth context,
                  and mark it arrived without entering the admin surface.
                </p>
              </div>
              <div className="grid gap-3 sm:grid-cols-3">
                <Card className="border-dashed bg-background/70 shadow-none">
                  <CardHeader className="space-y-1 pb-2">
                    <CardDescription>Pending arrivals</CardDescription>
                    <CardTitle className="text-3xl">{summary.pendingCount}</CardTitle>
                  </CardHeader>
                </Card>
                <Card className="border-dashed bg-background/70 shadow-none">
                  <CardHeader className="space-y-1 pb-2">
                    <CardDescription>Arrived companies</CardDescription>
                    <CardTitle className="text-3xl">{summary.arrivedCount}</CardTitle>
                  </CardHeader>
                </Card>
                <Card className="border-dashed bg-background/70 shadow-none">
                  <CardHeader className="space-y-1 pb-2">
                    <CardDescription>Placed companies</CardDescription>
                    <CardTitle className="text-3xl">{summary.placedCompanyCount}</CardTitle>
                  </CardHeader>
                </Card>
              </div>
            </div>

            <div className="flex flex-col gap-3 lg:max-w-sm">
              <Card className="border-primary/20 bg-primary/5 shadow-none">
                <CardHeader className="gap-2 pb-4">
                  <CardDescription className="text-primary">Next focus</CardDescription>
                  <CardTitle className="text-base leading-6">{summary.nextArrivalLabel}</CardTitle>
                </CardHeader>
              </Card>
              <div className="flex flex-col gap-2 sm:flex-row">
                <Button
                  className="flex-1"
                  onClick={refreshWorkspace}
                  type="button"
                  variant="outline"
                >
                  <RefreshCwIcon className="size-4" />
                  Refresh board
                </Button>
                <Button
                  className="flex-1"
                  disabled={isSigningOut}
                  onClick={() => {
                    void handleSignOut();
                  }}
                  type="button"
                  variant="ghost"
                >
                  <LogOutIcon className="size-4" />
                  Sign out
                </Button>
              </div>
            </div>
          </div>
        </section>

        {workspaceMessage ? (
          <Alert>
            <BadgeCheckIcon className="size-4" />
            <AlertTitle>Arrival updated</AlertTitle>
            <AlertDescription>{workspaceMessage}</AlertDescription>
          </Alert>
        ) : null}

        {workspaceError ? (
          <Alert variant="error">
            <CircleAlertIcon className="size-4" />
            <AlertTitle>Update failed</AlertTitle>
            <AlertDescription>{workspaceError}</AlertDescription>
          </Alert>
        ) : null}

        <section className="grid gap-6 lg:grid-cols-[minmax(0,1.5fr)_minmax(300px,0.9fr)]">
          <Card>
            <CardHeader className="gap-4">
              <div className="space-y-1">
                <CardTitle>Company arrival queue</CardTitle>
                <CardDescription>
                  Search by company, room code, or stand number and keep the queue moving.
                </CardDescription>
              </div>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <div className="relative flex-1">
                  <SearchIcon className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    className="pl-9"
                    onChange={(event) => {
                      setSearchQuery(event.target.value);
                    }}
                    placeholder="Search company, room, or stand"
                    value={searchQuery}
                  />
                </div>
                <div className="flex flex-wrap gap-2">
                  {arrivalFilterOptions.map((option) => (
                    <Button
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
            </CardHeader>
            <CardContent className="space-y-4">
              {venueRoomsState.kind === "loading" ? (
                <div className="space-y-3">
                  <Skeleton className="h-24 w-full rounded-2xl" />
                  <Skeleton className="h-24 w-full rounded-2xl" />
                  <Skeleton className="h-24 w-full rounded-2xl" />
                </div>
              ) : null}

              {venueRoomsState.kind === "failure" ? (
                <Empty>
                  <EmptyHeader>
                    <EmptyMedia variant="icon">
                      <CircleAlertIcon className="size-5" />
                    </EmptyMedia>
                    <EmptyTitle>Arrival board unavailable</EmptyTitle>
                    <EmptyDescription>{venueRoomsState.message}</EmptyDescription>
                  </EmptyHeader>
                  <EmptyContent>
                    <Button onClick={refreshWorkspace} type="button" variant="outline">
                      <RefreshCwIcon className="size-4" />
                      Try again
                    </Button>
                  </EmptyContent>
                </Empty>
              ) : null}

              {venueRoomsState.kind === "success" && visibleCompanies.length === 0 ? (
                <Empty>
                  <EmptyHeader>
                    <EmptyMedia variant="icon">
                      <SearchIcon className="size-5" />
                    </EmptyMedia>
                    <EmptyTitle>No matching companies</EmptyTitle>
                    <EmptyDescription>
                      Adjust the filter or search query to reveal the next booth to process.
                    </EmptyDescription>
                  </EmptyHeader>
                </Empty>
              ) : null}

              {venueRoomsState.kind === "success"
                ? visibleCompanies.map((company) => {
                    const isPendingAction = pendingCompanyId === company.companyId;
                    const isArrived = company.arrivalStatus === "arrived";

                    return (
                      <article
                        key={company.companyId}
                        className="rounded-2xl border bg-background/70 p-4 shadow-sm"
                      >
                        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                          <div className="space-y-3">
                            <div className="flex flex-wrap items-center gap-2">
                              <Badge variant={isArrived ? "secondary" : "default"}>
                                {isArrived ? "Arrived" : "Pending arrival"}
                              </Badge>
                              <Badge variant="outline">{company.roomCode}</Badge>
                              <Badge variant="outline">Stand {company.standNumber}</Badge>
                            </div>
                            <div className="space-y-1">
                              <h2 className="text-lg font-semibold text-foreground">
                                {company.companyName}
                              </h2>
                              <p className="text-sm text-muted-foreground">
                                Room {company.roomCode} • Stand {company.standNumber}
                              </p>
                            </div>
                          </div>

                          <Button
                            disabled={isArrived || isPendingAction}
                            onClick={() => {
                              void submitArrival(company.companyId, company.companyName);
                            }}
                            type="button"
                          >
                            {isPendingAction ? (
                              <>
                                <LoaderCircleIcon className="size-4 animate-spin" />
                                Saving
                              </>
                            ) : isArrived ? (
                              <>
                                <BadgeCheckIcon className="size-4" />
                                Already arrived
                              </>
                            ) : (
                              <>
                                <ClipboardCheckIcon className="size-4" />
                                Mark arrived
                              </>
                            )}
                          </Button>
                        </div>
                      </article>
                    );
                  })
                : null}
            </CardContent>
          </Card>

          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Venue coverage</CardTitle>
                <CardDescription>
                  Quick context for the staff member currently handling arrivals.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 text-sm text-muted-foreground">
                <div className="flex items-center justify-between gap-3">
                  <span className="inline-flex items-center gap-2">
                    <Building2Icon className="size-4" />
                    Rooms in venue board
                  </span>
                  <span className="font-medium text-foreground">{summary.roomCount}</span>
                </div>
                <Separator />
                <div className="flex items-center justify-between gap-3">
                  <span>Remaining arrivals</span>
                  <span className="font-medium text-foreground">{summary.pendingCount}</span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span>Completed arrivals</span>
                  <span className="font-medium text-foreground">{summary.arrivedCount}</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Operating notes</CardTitle>
                <CardDescription>
                  This surface stays intentionally narrower than admin.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 text-sm leading-6 text-muted-foreground">
                <p>
                  Use this board only to confirm that a placed company has arrived on site.
                </p>
                <p>
                  Placement management stays in admin, but the check-in team still sees room and
                  stand context to avoid wrong-booth updates.
                </p>
                <p>
                  Search works across company names, room codes, and stand numbers for fast on-site
                  lookup from a phone or laptop.
                </p>
              </CardContent>
            </Card>
          </div>
        </section>
      </div>
    </main>
  );
}
