"use client";

import { useAtomRefresh, useAtomSet } from "@effect/atom-react";
import { Alert, AlertDescription, AlertTitle } from "@project/ui/components/alert";
import { Badge } from "@project/ui/components/badge";
import { Button } from "@project/ui/components/button";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@project/ui/components/empty";
import { Input } from "@project/ui/components/input";
import { Label } from "@project/ui/components/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@project/ui/components/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@project/ui/components/table";
import { BadgeCheckIcon, Building2Icon, CircleAlertIcon, SearchIcon } from "lucide-react";
import type React from "react";
import { startTransition, useDeferredValue, useMemo, useState } from "react";

import {
  AdminFailurePanel,
  AdminLoadingPanel,
  AdminPageHeader,
} from "@/components/admin/admin-page-primitives";
import {
  formatAdminMutationError,
  useAdminAccessLedgerState,
  useAdminCompanyLedgerState,
} from "@/lib/admin-page-data";
import { adminWorkspaceAtoms, adminWorkspaceReactivity } from "@/lib/admin-atoms";
import {
  describeAdminPlacement,
  filterAdminCompanyLedger,
} from "@/lib/admin-workspace";

const companyArrivalOptions = [
  { value: "pending", label: "Pending arrival" },
  { value: "arrived", label: "Arrived" },
  { value: "all", label: "All arrival states" },
] as const;

const companyPlacementOptions = [
  { value: "placed", label: "Placed" },
  { value: "unplaced", label: "Unplaced" },
  { value: "all", label: "All placements" },
] as const;

const arrivalBadgeVariant = (status: "arrived" | "not-arrived"): React.ComponentProps<typeof Badge>["variant"] =>
  status === "arrived" ? "success" : "outline";

export function AdminCompaniesPage(): React.ReactElement {
  const companyLedgerState = useAdminCompanyLedgerState();
  const accessLedgerState = useAdminAccessLedgerState();
  const refreshCompanyLedger = useAtomRefresh(adminWorkspaceAtoms.companyLedger);
  const refreshAccessLedger = useAtomRefresh(adminWorkspaceAtoms.accessLedger);
  const createCompanyAccount = useAtomSet(adminWorkspaceAtoms.createCompanyAccount, {
    mode: "promise",
  });
  const [companyQuery, setCompanyQuery] = useState("");
  const [companyArrivalFilter, setCompanyArrivalFilter] =
    useState<(typeof companyArrivalOptions)[number]["value"]>("pending");
  const [companyPlacementFilter, setCompanyPlacementFilter] =
    useState<(typeof companyPlacementOptions)[number]["value"]>("all");
  const [createState, setCreateState] = useState({
    companyName: "",
    accountName: "",
    email: "",
    password: "",
  });
  const [createError, setCreateError] = useState<string | null>(null);
  const [createMessage, setCreateMessage] = useState<string | null>(null);
  const [isCreatingCompanyAccount, setIsCreatingCompanyAccount] = useState(false);

  const companyLedger = companyLedgerState.kind === "success" ? companyLedgerState.value : [];
  const placedCount = companyLedger.filter((entry) => entry.room != null).length;
  const arrivedCount = companyLedger.filter((entry) => entry.arrivalStatus === "arrived").length;
  const ownersByCompanyId = useMemo(
    () =>
      new Map(
        (accessLedgerState.kind === "success" ? accessLedgerState.value : [])
          .flatMap((entry) =>
            entry.company == null
              ? []
              : [[entry.company.id as string, { email: entry.user.email, name: entry.user.name }]]),
      ),
    [accessLedgerState],
  );
  const visibleCompanies = filterAdminCompanyLedger(companyLedger, {
    query: useDeferredValue(companyQuery),
    arrival: companyArrivalFilter,
    placement: companyPlacementFilter,
  });

  const handleCreateCompanyAccount = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const nextCompanyName = createState.companyName.trim();
    const nextAccountName = createState.accountName.trim();
    const nextEmail = createState.email.trim();

    if (
      nextCompanyName.length === 0 ||
      nextAccountName.length === 0 ||
      nextEmail.length === 0 ||
      createState.password.length === 0
    ) {
      setCreateError("Complete all company account fields before creating the account.");
      setCreateMessage(null);
      return;
    }

    setCreateError(null);
    setCreateMessage(null);
    setIsCreatingCompanyAccount(true);

    try {
      await createCompanyAccount({
        payload: {
          companyName: nextCompanyName,
          accountName: nextAccountName,
          email: nextEmail,
          password: createState.password,
        },
        reactivityKeys: {
          accessLedger: adminWorkspaceReactivity.accessLedger,
          companyLedger: adminWorkspaceReactivity.companyLedger,
        },
      });
      refreshAccessLedger();
      refreshCompanyLedger();
      setCreateState({
        companyName: "",
        accountName: "",
        email: "",
        password: "",
      });
      startTransition(() => {
        setCreateMessage(`Company account created for ${nextCompanyName}.`);
      });
    } catch (error) {
      setCreateError(formatAdminMutationError(error));
    } finally {
      setIsCreatingCompanyAccount(false);
    }
  };

  return (
    <div className="space-y-8">
      <AdminPageHeader
        description="Inspect company records, provision company access, and review recruiter rosters without mixing in venue, map, or access controls."
        eyebrow="Admin companies"
        title="Companies and recruiter rosters"
      />

      {createMessage ? (
        <Alert>
          <BadgeCheckIcon className="size-4" />
          <AlertTitle>Company account created</AlertTitle>
          <AlertDescription>{createMessage}</AlertDescription>
        </Alert>
      ) : null}

      {createError ? (
        <Alert variant="error">
          <CircleAlertIcon className="size-4" />
          <AlertTitle>Company account creation failed</AlertTitle>
          <AlertDescription>{createError}</AlertDescription>
        </Alert>
      ) : null}

      <section className="grid gap-px border border-[var(--s2ee-border)] bg-[var(--s2ee-border)] md:grid-cols-3">
        {[
          ["Companies", companyLedger.length],
          ["Placed", placedCount],
          ["Arrived", arrivedCount],
        ].map(([label, value]) => (
          <div className="bg-white p-5" key={label}>
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[color:var(--s2ee-muted-foreground)]">
              {label}
            </p>
            <p className="mt-4 text-4xl font-black tracking-[-0.08em] text-slate-900">{value}</p>
          </div>
        ))}
      </section>

      <div className="grid gap-6 xl:grid-cols-[380px_minmax(0,1fr)]">
        <section className="space-y-6 border border-[var(--s2ee-border)] bg-white p-5 sm:p-6">
          <div className="space-y-2 border-b border-[var(--s2ee-border)] pb-5">
            <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-[color:var(--s2ee-muted-foreground)]">
              Provision company access
            </p>
            <p className="text-sm leading-6 text-[color:var(--s2ee-muted-foreground)]">
              Create the company login and the linked company record in one admin action. Recruiter
              roster edits still stay with the company account after first sign-in.
            </p>
          </div>

          <form className="space-y-5" onSubmit={handleCreateCompanyAccount}>
            <div className="space-y-2">
              <Label htmlFor="company-name">Company name</Label>
              <Input
                className="rounded-none border-[var(--s2ee-border)] bg-[var(--s2ee-surface-soft)] shadow-none"
                id="company-name"
                onChange={(event) => {
                  setCreateState((current) => ({ ...current, companyName: event.target.value }));
                }}
                placeholder="Atlas Systems"
                value={createState.companyName}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="account-name">Account contact name</Label>
              <Input
                className="rounded-none border-[var(--s2ee-border)] bg-[var(--s2ee-surface-soft)] shadow-none"
                id="account-name"
                onChange={(event) => {
                  setCreateState((current) => ({ ...current, accountName: event.target.value }));
                }}
                placeholder="Nora Recruiter"
                value={createState.accountName}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="account-email">Account email</Label>
              <Input
                className="rounded-none border-[var(--s2ee-border)] bg-[var(--s2ee-surface-soft)] shadow-none"
                id="account-email"
                inputMode="email"
                onChange={(event) => {
                  setCreateState((current) => ({ ...current, email: event.target.value }));
                }}
                placeholder="atlas@example.com"
                type="email"
                value={createState.email}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="account-password">Temporary password</Label>
              <Input
                className="rounded-none border-[var(--s2ee-border)] bg-[var(--s2ee-surface-soft)] shadow-none"
                id="account-password"
                onChange={(event) => {
                  setCreateState((current) => ({ ...current, password: event.target.value }));
                }}
                placeholder="Set an initial password"
                type="password"
                value={createState.password}
              />
            </div>

            <Button className="w-full" disabled={isCreatingCompanyAccount} type="submit">
              {isCreatingCompanyAccount ? "Creating..." : "Create company account"}
            </Button>
          </form>
        </section>

        <section className="space-y-6 border border-[var(--s2ee-border)] bg-white p-5 sm:p-6">
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_220px_220px]">
            <div className="relative">
              <SearchIcon className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[color:var(--s2ee-muted-foreground)]" />
              <Input
                className="rounded-none border-[var(--s2ee-border)] bg-[var(--s2ee-surface-soft)] pl-9 shadow-none"
                onChange={(event) => {
                  setCompanyQuery(event.target.value);
                }}
                placeholder="Search company, room, stand, recruiter"
                value={companyQuery}
              />
            </div>
            <Select
              onValueChange={(value) => {
                setCompanyArrivalFilter(value as (typeof companyArrivalOptions)[number]["value"]);
              }}
              value={companyArrivalFilter}
            >
              <SelectTrigger className="rounded-none border-[var(--s2ee-border)] bg-[var(--s2ee-surface-soft)] shadow-none">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {companyArrivalOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              onValueChange={(value) => {
                setCompanyPlacementFilter(value as (typeof companyPlacementOptions)[number]["value"]);
              }}
              value={companyPlacementFilter}
            >
              <SelectTrigger className="rounded-none border-[var(--s2ee-border)] bg-[var(--s2ee-surface-soft)] shadow-none">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {companyPlacementOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {(companyLedgerState.kind === "loading" || accessLedgerState.kind === "loading") ? (
            <AdminLoadingPanel />
          ) : null}
          {companyLedgerState.kind === "failure" ? (
            <AdminFailurePanel
              description={companyLedgerState.message}
              title="Company records unavailable"
            />
          ) : null}
          {accessLedgerState.kind === "failure" ? (
            <AdminFailurePanel
              description={accessLedgerState.message}
              title="Account records unavailable"
            />
          ) : null}
          {companyLedgerState.kind === "success" && visibleCompanies.length === 0 ? (
            <Empty className="border border-dashed border-[var(--s2ee-border)] p-8">
              <EmptyHeader>
                <EmptyMedia className="rounded-none" variant="icon">
                  <Building2Icon className="size-5" />
                </EmptyMedia>
                <EmptyTitle>No companies match these filters</EmptyTitle>
                <EmptyDescription>
                  Adjust the placement or arrival filters to inspect the full company ledger.
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          ) : null}
          {companyLedgerState.kind === "success" && visibleCompanies.length > 0 ? (
            <>
              <div className="hidden border border-[var(--s2ee-border)] lg:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Company</TableHead>
                      <TableHead>Account</TableHead>
                      <TableHead>Placement</TableHead>
                      <TableHead>Arrival</TableHead>
                      <TableHead>Recruiters</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {visibleCompanies.map((entry) => {
                      const owner = ownersByCompanyId.get(entry.company.id as string);

                      return (
                        <TableRow key={entry.company.id}>
                          <TableCell className="align-top">
                            <div className="space-y-1">
                              <p className="font-medium text-slate-900">{entry.company.name}</p>
                              <p className="text-sm text-[color:var(--s2ee-muted-foreground)]">
                                {entry.company.recruiters.length} recruiter
                                {entry.company.recruiters.length === 1 ? "" : "s"}
                              </p>
                            </div>
                          </TableCell>
                          <TableCell className="align-top text-sm text-[color:var(--s2ee-muted-foreground)]">
                            {owner == null ? (
                              "No linked account"
                            ) : (
                              <div className="space-y-1">
                                <p className="font-medium text-slate-900">{owner.name}</p>
                                <p>{owner.email}</p>
                              </div>
                            )}
                          </TableCell>
                          <TableCell className="align-top text-sm text-[color:var(--s2ee-muted-foreground)]">
                            {describeAdminPlacement(entry)}
                          </TableCell>
                          <TableCell className="align-top">
                            <Badge variant={arrivalBadgeVariant(entry.arrivalStatus)}>
                              {entry.arrivalStatus === "arrived" ? "Arrived" : "Pending"}
                            </Badge>
                          </TableCell>
                          <TableCell className="align-top">
                            <div className="flex flex-wrap gap-2">
                              {entry.company.recruiters.length === 0 ? (
                                <Badge variant="outline">No recruiters</Badge>
                              ) : (
                                entry.company.recruiters.map((recruiter) => (
                                  <Badge key={recruiter.id} variant="outline">
                                    {recruiter.name}
                                  </Badge>
                                ))
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>

              <div className="grid gap-px border border-[var(--s2ee-border)] bg-[var(--s2ee-border)] lg:hidden">
                {visibleCompanies.map((entry) => {
                  const owner = ownersByCompanyId.get(entry.company.id as string);

                  return (
                    <div className="bg-white p-5" key={entry.company.id}>
                      <div className="flex items-start justify-between gap-3">
                        <div className="space-y-1">
                          <p className="text-sm font-bold uppercase tracking-[0.08em] text-slate-900">
                            {entry.company.name}
                          </p>
                          <p className="text-sm leading-6 text-[color:var(--s2ee-muted-foreground)]">
                            {describeAdminPlacement(entry)}
                          </p>
                          {owner ? (
                            <p className="text-sm leading-6 text-[color:var(--s2ee-muted-foreground)]">
                              {owner.name} · {owner.email}
                            </p>
                          ) : null}
                        </div>
                        <Badge variant={arrivalBadgeVariant(entry.arrivalStatus)}>
                          {entry.arrivalStatus === "arrived" ? "Arrived" : "Pending"}
                        </Badge>
                      </div>
                      <div className="mt-4 flex flex-wrap gap-2">
                        {entry.company.recruiters.length === 0 ? (
                          <Badge variant="outline">No recruiters</Badge>
                        ) : (
                          entry.company.recruiters.map((recruiter) => (
                            <Badge key={recruiter.id} variant="outline">
                              {recruiter.name}
                            </Badge>
                          ))
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          ) : null}
        </section>
      </div>
    </div>
  );
}
