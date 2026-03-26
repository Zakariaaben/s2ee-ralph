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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@project/ui/components/select";
import type { AdminAccessLedgerEntry, UserRoleValue } from "@project/domain";
import { CircleAlertIcon, SearchIcon, UsersRoundIcon } from "lucide-react";
import type React from "react";
import { startTransition, useDeferredValue, useEffect, useState } from "react";

import {
  AdminFailurePanel,
  AdminLoadingPanel,
  AdminPageHeader,
} from "@/components/admin/admin-page-primitives";
import {
  formatAdminMutationError,
  useAdminAccessLedgerState,
} from "@/lib/admin-page-data";
import {
  adminWorkspaceAtoms,
  adminWorkspaceReactivity,
} from "@/lib/admin-atoms";
import {
  describeAdminAccessAccount,
  describeAdminAccessSubject,
  filterAdminAccessLedger,
} from "@/lib/admin-workspace";

const accessRoleFilterOptions = [
  { value: "all", label: "Tous les roles" },
  { value: "admin", label: "Admin" },
  { value: "company", label: "Entreprise" },
  { value: "check-in", label: "Accueil" },
  { value: "student", label: "Etudiant" },
] as const;

const roleOptions = [
  { value: "admin", label: "Admin" },
  { value: "company", label: "Entreprise" },
  { value: "check-in", label: "Accueil" },
  { value: "student", label: "Etudiant" },
] as const;

const roleBadgeVariant = (
  role: UserRoleValue,
): React.ComponentProps<typeof Badge>["variant"] => {
  switch (role) {
    case "admin":
      return "warning";
    case "company":
      return "default";
    case "check-in":
      return "info";
    case "student":
      return "secondary";
  }
};

export function AdminAccessPage(): React.ReactElement {
  const accessLedgerState = useAdminAccessLedgerState();
  const refreshAccessLedger = useAtomRefresh(adminWorkspaceAtoms.accessLedger);
  const changeUserRole = useAtomSet(adminWorkspaceAtoms.changeUserRole, {
    mode: "promise",
  });
  const [accessQuery, setAccessQuery] = useState("");
  const [accessRoleFilter, setAccessRoleFilter] =
    useState<(typeof accessRoleFilterOptions)[number]["value"]>("all");
  const [roleDrafts, setRoleDrafts] = useState<Record<string, UserRoleValue>>({});
  const [pendingUserId, setPendingUserId] = useState<string | null>(null);
  const [workspaceMessage, setWorkspaceMessage] = useState<string | null>(null);
  const [workspaceError, setWorkspaceError] = useState<string | null>(null);

  useEffect(() => {
    if (accessLedgerState.kind !== "success") {
      return;
    }

    setRoleDrafts(
      Object.fromEntries(accessLedgerState.value.map((entry) => [entry.user.id, entry.user.role])),
    );
  }, [accessLedgerState.kind, accessLedgerState.kind === "success" ? accessLedgerState.value : null]);

  const visibleAccessEntries = filterAdminAccessLedger(
    accessLedgerState.kind === "success" ? accessLedgerState.value : [],
    {
      query: useDeferredValue(accessQuery),
      role: accessRoleFilter,
    },
  );

  const applyRoleChange = async (entry: AdminAccessLedgerEntry) => {
    const nextRole = roleDrafts[entry.user.id] ?? entry.user.role;

    if (nextRole === entry.user.role) {
      return;
    }

    setPendingUserId(entry.user.id);
    setWorkspaceError(null);
    setWorkspaceMessage(null);

    try {
      await changeUserRole({
        payload: {
          userId: entry.user.id,
          role: nextRole,
        },
        reactivityKeys: adminWorkspaceReactivity.accessLedger,
      });
      refreshAccessLedger();
      startTransition(() => {
        setWorkspaceMessage(`${describeAdminAccessAccount(entry)} est maintenant affecte au role ${roleOptions.find((option) => option.value === nextRole)?.label ?? nextRole}.`);
      });
    } catch (error) {
      setWorkspaceError(formatAdminMutationError(error));
    } finally {
      setPendingUserId(null);
    }
  };

  return (
    <div className="space-y-8">
      <AdminPageHeader
        description=""
        eyebrow="Admin"
        title="Acces"
      />

      {workspaceMessage ? (
        <Alert>
          <UsersRoundIcon className="size-4" />
          <AlertTitle>Role mis a jour</AlertTitle>
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

      <section className="space-y-6 border border-[var(--s2ee-border)] bg-white p-5 sm:p-6">
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_220px]">
          <div className="relative">
            <SearchIcon className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[color:var(--s2ee-muted-foreground)]" />
            <Input
              className="rounded-none border-[var(--s2ee-border)] bg-[var(--s2ee-surface-soft)] pl-9 shadow-none"
              onChange={(event) => {
                setAccessQuery(event.target.value);
              }}
              placeholder="Rechercher un compte, un email ou un profil"
              value={accessQuery}
            />
          </div>
          <Select
            onValueChange={(value) => {
              setAccessRoleFilter(value as (typeof accessRoleFilterOptions)[number]["value"]);
            }}
            value={accessRoleFilter}
          >
            <SelectTrigger className="rounded-none border-[var(--s2ee-border)] bg-[var(--s2ee-surface-soft)] shadow-none">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {accessRoleFilterOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {accessLedgerState.kind === "loading" ? <AdminLoadingPanel /> : null}
        {accessLedgerState.kind === "failure" ? (
          <AdminFailurePanel
            description={accessLedgerState.message}
            title="Acces indisponibles"
          />
        ) : null}
        {accessLedgerState.kind === "success" && visibleAccessEntries.length === 0 ? (
          <Empty className="border border-dashed border-[var(--s2ee-border)] p-8">
            <EmptyHeader>
              <EmptyMedia className="rounded-none" variant="icon">
                <UsersRoundIcon className="size-5" />
              </EmptyMedia>
              <EmptyTitle>Aucun compte ne correspond</EmptyTitle>
              <EmptyDescription>
                Modifiez les filtres pour afficher plus de resultats.
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : null}
        {accessLedgerState.kind === "success" && visibleAccessEntries.length > 0 ? (
          <div className="grid gap-px border border-[var(--s2ee-border)] bg-[var(--s2ee-border)]">
            {visibleAccessEntries.map((entry) => {
              const draftRole = roleDrafts[entry.user.id] ?? entry.user.role;
              const hasPendingChange = draftRole !== entry.user.role;
              const isPending = pendingUserId === entry.user.id;

              return (
                <div className="bg-white p-5" key={entry.user.id}>
                  <div className="grid gap-4 xl:grid-cols-[minmax(0,1.3fr)_minmax(260px,0.9fr)] xl:items-center">
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-bold uppercase tracking-[0.08em] text-slate-900">
                          {describeAdminAccessAccount(entry)}
                        </p>
                        <Badge variant={roleBadgeVariant(entry.user.role)}>{entry.user.role}</Badge>
                      </div>
                      <p className="text-sm text-[color:var(--s2ee-muted-foreground)]">
                        {entry.user.email}
                      </p>
                      <p className="text-sm text-[color:var(--s2ee-muted-foreground)]">
                        Profil lie : {describeAdminAccessSubject(entry)}
                      </p>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto]">
                      <Select
                        onValueChange={(value) => {
                          setRoleDrafts((current) => ({
                            ...current,
                            [entry.user.id]: value as UserRoleValue,
                          }));
                        }}
                        value={draftRole}
                      >
                        <SelectTrigger className="rounded-none border-[var(--s2ee-border)] bg-[var(--s2ee-surface-soft)] shadow-none">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {roleOptions.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button
                        disabled={!hasPendingChange || isPending}
                        onClick={() => {
                          void applyRoleChange(entry);
                        }}
                        type="button"
                      >
                        {isPending ? "Enregistrement..." : "Appliquer"}
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : null}
      </section>
    </div>
  );
}
