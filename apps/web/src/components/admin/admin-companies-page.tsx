"use client";

import { useAtomRefresh, useAtomSet } from "@effect/atom-react";
import { Alert, AlertDescription, AlertTitle } from "@project/ui/components/alert";
import { Badge } from "@project/ui/components/badge";
import { Button } from "@project/ui/components/button";
import {
  Dialog,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogPanel,
  DialogPopup,
  DialogTitle,
} from "@project/ui/components/dialog";
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
import { Textarea } from "@project/ui/components/textarea";
import {
  BadgeCheckIcon,
  Building2Icon,
  CircleAlertIcon,
  PencilIcon,
  SearchIcon,
  Trash2Icon,
} from "lucide-react";
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
import type { Company } from "@project/domain";
import {
  describeAdminPlacement,
  filterAdminCompanyLedger,
} from "@/lib/admin-workspace";

const companyArrivalOptions = [
  { value: "pending", label: "Arrivee en attente" },
  { value: "arrived", label: "Arrivee" },
  { value: "all", label: "Tous les etats" },
] as const;

const companyPlacementOptions = [
  { value: "placed", label: "Placees" },
  { value: "unplaced", label: "Non placees" },
  { value: "all", label: "Tous les placements" },
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
  const updateAdminCompany = useAtomSet(adminWorkspaceAtoms.updateAdminCompany, {
    mode: "promise",
  });
  const deleteAdminCompany = useAtomSet(adminWorkspaceAtoms.deleteAdminCompany, {
    mode: "promise",
  });
  const importAdminCompaniesCsv = useAtomSet(adminWorkspaceAtoms.importAdminCompaniesCsv, {
    mode: "promise",
  });
  const [companyQuery, setCompanyQuery] = useState("");
  const [companyArrivalFilter, setCompanyArrivalFilter] =
    useState<(typeof companyArrivalOptions)[number]["value"]>("pending");
  const [companyPlacementFilter, setCompanyPlacementFilter] =
    useState<(typeof companyPlacementOptions)[number]["value"]>("all");
  const [createState, setCreateState] = useState({
    companyName: "",
    email: "",
    password: "",
    logoUrl: "",
    zoneCode: "",
    roomCode: "",
  });
  const [createError, setCreateError] = useState<string | null>(null);
  const [createMessage, setCreateMessage] = useState<string | null>(null);
  const [isCreatingCompanyAccount, setIsCreatingCompanyAccount] = useState(false);
  const [editingCompany, setEditingCompany] = useState<{
    companyId: Company["id"];
    name: string;
    email: string;
    password: string;
    logoUrl: string;
    zoneCode: string;
    roomCode: string;
  } | null>(null);
  const [editError, setEditError] = useState<string | null>(null);
  const [isEditingCompany, setIsEditingCompany] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [isDeletingCompany, setIsDeletingCompany] = useState(false);
  const [csvContents, setCsvContents] = useState("");
  const [importError, setImportError] = useState<string | null>(null);
  const [importMessage, setImportMessage] = useState<string | null>(null);
  const [isImportingCsv, setIsImportingCsv] = useState(false);

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
    const nextEmail = createState.email.trim();

    if (
      nextCompanyName.length === 0 ||
      nextEmail.length === 0 ||
      createState.password.length === 0
    ) {
      setCreateError("Renseignez tous les champs avant de creer le compte entreprise.");
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
          email: nextEmail,
          password: createState.password,
          logoUrl: createState.logoUrl.trim() || undefined,
          zoneCode: createState.zoneCode.trim() || undefined,
          roomCode: createState.roomCode.trim() || undefined,
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
        email: "",
        password: "",
        logoUrl: "",
        zoneCode: "",
        roomCode: "",
      });
      startTransition(() => {
        setCreateMessage(`Compte entreprise cree pour ${nextCompanyName}.`);
      });
    } catch (error) {
      setCreateError(formatAdminMutationError(error));
    } finally {
      setIsCreatingCompanyAccount(false);
    }
  };

  const handleUpdateCompany = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (editingCompany == null) return;

    const nextName = editingCompany.name.trim();
    const nextEmail = editingCompany.email.trim();
    const nextPassword = editingCompany.password.trim();
    const nextLogoUrl = editingCompany.logoUrl.trim();
    const nextZoneCode = editingCompany.zoneCode.trim();
    const nextRoomCode = editingCompany.roomCode.trim();

    if (
      nextName.length === 0 &&
      nextEmail.length === 0 &&
      nextPassword.length === 0 &&
      nextLogoUrl.length === 0 &&
      nextZoneCode.length === 0 &&
      nextRoomCode.length === 0
    ) {
      setEditError("Renseignez au moins un champ a modifier.");
      return;
    }

    setEditError(null);
    setIsEditingCompany(true);

    try {
      await updateAdminCompany({
        payload: {
          companyId: editingCompany.companyId,
          name: nextName.length > 0 ? nextName : undefined,
          email: nextEmail.length > 0 ? nextEmail : undefined,
          password: nextPassword.length > 0 ? nextPassword : undefined,
          logoUrl: nextLogoUrl.length > 0 ? nextLogoUrl : undefined,
          zoneCode: nextZoneCode.length > 0 ? nextZoneCode : undefined,
          roomCode: nextRoomCode.length > 0 ? nextRoomCode : undefined,
        },
        reactivityKeys: {
          accessLedger: adminWorkspaceReactivity.accessLedger,
          companyLedger: adminWorkspaceReactivity.companyLedger,
        },
      });
      refreshAccessLedger();
      refreshCompanyLedger();
      setEditingCompany(null);
    } catch (error) {
      setEditError(formatAdminMutationError(error));
    } finally {
      setIsEditingCompany(false);
    }
  };

  const handleImportCompaniesCsv = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (csvContents.trim().length === 0) {
      setImportError("Collez un CSV avant de lancer l'import.");
      return;
    }

    setImportError(null);
    setImportMessage(null);
    setIsImportingCsv(true);

    try {
      const createdCount = await importAdminCompaniesCsv({
        payload: { csvContents },
        reactivityKeys: {
          accessLedger: adminWorkspaceReactivity.accessLedger,
          companyLedger: adminWorkspaceReactivity.companyLedger,
        },
      });
      refreshAccessLedger();
      refreshCompanyLedger();
      setCsvContents("");
      setImportMessage(`${createdCount} entreprise(s) importee(s).`);
    } catch (error) {
      setImportError(formatAdminMutationError(error));
    } finally {
      setIsImportingCsv(false);
    }
  };

  const handleDeleteCompany = async (companyId: Company["id"]) => {
    if (!window.confirm("Supprimer definitivement cette entreprise et son compte ?")) {
      return;
    }

    setDeleteError(null);
    setIsDeletingCompany(true);

    try {
      await deleteAdminCompany({
        payload: { companyId },
        reactivityKeys: {
          accessLedger: adminWorkspaceReactivity.accessLedger,
          companyLedger: adminWorkspaceReactivity.companyLedger,
        },
      });
      refreshAccessLedger();
      refreshCompanyLedger();
    } catch (error) {
      setDeleteError(formatAdminMutationError(error));
    } finally {
      setIsDeletingCompany(false);
    }
  };

  return (
    <div className="space-y-8">
      <AdminPageHeader
        description=""
        eyebrow="Admin"
        title="Entreprises"
      />

      {createMessage ? (
        <Alert>
          <BadgeCheckIcon className="size-4" />
          <AlertTitle>Compte entreprise cree</AlertTitle>
          <AlertDescription>{createMessage}</AlertDescription>
        </Alert>
      ) : null}

      {createError ? (
        <Alert variant="error">
          <CircleAlertIcon className="size-4" />
          <AlertTitle>Echec de creation</AlertTitle>
          <AlertDescription>{createError}</AlertDescription>
        </Alert>
      ) : null}

      {editError ? (
        <Alert variant="error">
          <CircleAlertIcon className="size-4" />
          <AlertTitle>Echec de modification</AlertTitle>
          <AlertDescription>{editError}</AlertDescription>
        </Alert>
      ) : null}

      {deleteError ? (
        <Alert variant="error">
          <CircleAlertIcon className="size-4" />
          <AlertTitle>Echec de suppression</AlertTitle>
          <AlertDescription>{deleteError}</AlertDescription>
        </Alert>
      ) : null}

      {importMessage ? (
        <Alert>
          <BadgeCheckIcon className="size-4" />
          <AlertTitle>Import termine</AlertTitle>
          <AlertDescription>{importMessage}</AlertDescription>
        </Alert>
      ) : null}

      {importError ? (
        <Alert variant="error">
          <CircleAlertIcon className="size-4" />
          <AlertTitle>Echec d'import</AlertTitle>
          <AlertDescription>{importError}</AlertDescription>
        </Alert>
      ) : null}

      <section className="grid gap-px border border-[var(--s2ee-border)] bg-[var(--s2ee-border)] md:grid-cols-3">
        {[
          ["Entreprises", companyLedger.length],
          ["Placees", placedCount],
          ["Arrivees", arrivedCount],
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
              Nouveau compte
            </p>
          </div>

          <form className="space-y-5" onSubmit={handleCreateCompanyAccount}>
            <div className="space-y-2">
              <Label htmlFor="company-name">Nom de l'entreprise</Label>
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
              <Label htmlFor="account-email">Email</Label>
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
              <Label htmlFor="account-password">Mot de passe temporaire</Label>
              <Input
                className="rounded-none border-[var(--s2ee-border)] bg-[var(--s2ee-surface-soft)] shadow-none"
                id="account-password"
                onChange={(event) => {
                  setCreateState((current) => ({ ...current, password: event.target.value }));
                }}
                placeholder="Definir un mot de passe temporaire"
                type="password"
                value={createState.password}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="company-logo-url">Logo URL</Label>
              <Input
                className="rounded-none border-[var(--s2ee-border)] bg-[var(--s2ee-surface-soft)] shadow-none"
                id="company-logo-url"
                onChange={(event) => {
                  setCreateState((current) => ({ ...current, logoUrl: event.target.value }));
                }}
                placeholder="https://..."
                value={createState.logoUrl}
              />
            </div>
            <div className="grid gap-5 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="company-zone-code">Zone</Label>
                <Input
                  className="rounded-none border-[var(--s2ee-border)] bg-[var(--s2ee-surface-soft)] shadow-none"
                  id="company-zone-code"
                  onChange={(event) => {
                    setCreateState((current) => ({ ...current, zoneCode: event.target.value }));
                  }}
                  placeholder="NS"
                  value={createState.zoneCode}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="company-room-code">Salle</Label>
                <Input
                  className="rounded-none border-[var(--s2ee-border)] bg-[var(--s2ee-surface-soft)] shadow-none"
                  id="company-room-code"
                  onChange={(event) => {
                    setCreateState((current) => ({ ...current, roomCode: event.target.value }));
                  }}
                  placeholder="NS24"
                  value={createState.roomCode}
                />
              </div>
            </div>

            <Button className="w-full" disabled={isCreatingCompanyAccount} type="submit">
              {isCreatingCompanyAccount ? "Creation..." : "Creer le compte entreprise"}
            </Button>
          </form>

          <div className="space-y-4 border-t border-[var(--s2ee-border)] pt-5">
            <div className="space-y-2">
              <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-[color:var(--s2ee-muted-foreground)]">
                Import CSV
              </p>
              <p className="text-sm text-[color:var(--s2ee-muted-foreground)]">
                Colonnes attendues: company_name,email,password,logo_url,zone,salle
              </p>
            </div>
            <form className="space-y-4" onSubmit={handleImportCompaniesCsv}>
              <Textarea
                className="min-h-40 rounded-none border-[var(--s2ee-border)] bg-[var(--s2ee-surface-soft)] shadow-none"
                onChange={(event) => {
                  setCsvContents(event.target.value);
                }}
                placeholder={'company_name,email,password,logo_url,zone,salle\nAtlas,atlas@example.com,temp123,https://cdn/logo.png,NS,NS24'}
                value={csvContents}
              />
              <Button className="w-full" disabled={isImportingCsv} type="submit" variant="outline">
                {isImportingCsv ? "Import..." : "Importer le CSV"}
              </Button>
            </form>
          </div>
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
                placeholder="Rechercher une entreprise, une zone, une salle ou un recruteur"
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
              title="Entreprises indisponibles"
            />
          ) : null}
          {accessLedgerState.kind === "failure" ? (
            <AdminFailurePanel
              description={accessLedgerState.message}
              title="Comptes indisponibles"
            />
          ) : null}
          {companyLedgerState.kind === "success" && visibleCompanies.length === 0 ? (
            <Empty className="border border-dashed border-[var(--s2ee-border)] p-8">
              <EmptyHeader>
                <EmptyMedia className="rounded-none" variant="icon">
                  <Building2Icon className="size-5" />
                </EmptyMedia>
                <EmptyTitle>Aucune entreprise ne correspond</EmptyTitle>
                <EmptyDescription>
                  Modifiez les filtres d'arrivee ou d'affectation.
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
                      <TableHead>Entreprise</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Placement</TableHead>
                      <TableHead>Arrivee</TableHead>
                      <TableHead>Recruteurs</TableHead>
                      <TableHead className="w-[120px]">Actions</TableHead>
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
                                {entry.company.recruiters.length} recruteur
                                {entry.company.recruiters.length === 1 ? "" : "s"}
                              </p>
                            </div>
                          </TableCell>
                          <TableCell className="align-top text-sm text-[color:var(--s2ee-muted-foreground)]">
                            {owner == null ? (
                              "Aucun compte lie"
                            ) : (
                              owner.email
                            )}
                          </TableCell>
                          <TableCell className="align-top text-sm text-[color:var(--s2ee-muted-foreground)]">
                            {describeAdminPlacement(entry)}
                          </TableCell>
                          <TableCell className="align-top">
                            <Badge variant={arrivalBadgeVariant(entry.arrivalStatus)}>
                              {entry.arrivalStatus === "arrived" ? "Arrivee" : "En attente"}
                            </Badge>
                          </TableCell>
                          <TableCell className="align-top">
                            <div className="flex flex-wrap gap-2">
                              {entry.company.recruiters.length === 0 ? (
                                <Badge variant="outline">Aucun recruteur</Badge>
                              ) : (
                                entry.company.recruiters.map((recruiter) => (
                                  <Badge key={recruiter.id} variant="outline">
                                    {recruiter.name}
                                  </Badge>
                                ))
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="align-top">
                            <div className="flex items-center gap-1">
                              <Button
                                className="size-8"
                                disabled={isDeletingCompany}
                                onClick={() => {
                                  const owner = ownersByCompanyId.get(entry.company.id as string);
                                  setEditingCompany({
                                    companyId: entry.company.id,
                                    name: entry.company.name,
                                    email: owner?.email ?? "",
                                    password: "",
                                    logoUrl: entry.company.logoUrl ?? "",
                                    zoneCode: entry.zone?.code ?? "",
                                    roomCode: entry.room?.code ?? "",
                                  });
                                }}
                                size="icon"
                                variant="ghost"
                              >
                                <PencilIcon className="size-4" />
                              </Button>
                              <Button
                                className="size-8"
                                disabled={isDeletingCompany}
                                onClick={() => handleDeleteCompany(entry.company.id)}
                                size="icon"
                                variant="ghost"
                              >
                                <Trash2Icon className="size-4 text-red-600" />
                              </Button>
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
                              {owner.email}
                            </p>
                          ) : null}
                        </div>
                        <Badge variant={arrivalBadgeVariant(entry.arrivalStatus)}>
                          {entry.arrivalStatus === "arrived" ? "Arrivee" : "En attente"}
                        </Badge>
                      </div>
                      <div className="mt-4 flex flex-wrap gap-2">
                        {entry.company.recruiters.length === 0 ? (
                          <Badge variant="outline">Aucun recruteur</Badge>
                        ) : (
                          entry.company.recruiters.map((recruiter) => (
                            <Badge key={recruiter.id} variant="outline">
                              {recruiter.name}
                            </Badge>
                          ))
                        )}
                      </div>
                      <div className="mt-3 flex items-center gap-1">
                        <Button
                          className="size-8"
                          disabled={isDeletingCompany}
                          onClick={() => {
                            const owner = ownersByCompanyId.get(entry.company.id as string);
                            setEditingCompany({
                              companyId: entry.company.id,
                              name: entry.company.name,
                              email: owner?.email ?? "",
                              password: "",
                              logoUrl: entry.company.logoUrl ?? "",
                              zoneCode: entry.zone?.code ?? "",
                              roomCode: entry.room?.code ?? "",
                            });
                          }}
                          size="icon"
                          variant="ghost"
                        >
                          <PencilIcon className="size-4" />
                        </Button>
                        <Button
                          className="size-8"
                          disabled={isDeletingCompany}
                          onClick={() => handleDeleteCompany(entry.company.id)}
                          size="icon"
                          variant="ghost"
                        >
                          <Trash2Icon className="size-4 text-red-600" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          ) : null}
        </section>
      </div>

      <Dialog
        onOpenChange={(open) => {
          if (!open) setEditingCompany(null);
        }}
        open={editingCompany != null}
      >
        <DialogPopup>
          <DialogHeader className="border-b bg-[var(--s2ee-surface-soft)] px-5 py-5 sm:px-8 sm:py-6 [border-color:var(--s2ee-border)]">
            <DialogTitle className="text-2xl font-black tracking-[-0.06em] text-[color:var(--s2ee-soft-foreground)]">
              Modifier l&apos;entreprise
            </DialogTitle>
            <DialogDescription className="max-w-3xl text-sm leading-7 text-[color:var(--s2ee-soft-foreground)]">
              Laissez un champ vide pour ne pas le modifier.
            </DialogDescription>
          </DialogHeader>

          <DialogPanel className="p-0" scrollFade={false}>
            <form className="space-y-5 p-5 sm:p-6" id="edit-company-form" onSubmit={handleUpdateCompany}>
              <div className="space-y-2">
                <Label htmlFor="edit-company-name">Nom de l&apos;entreprise</Label>
                <Input
                  className="rounded-none border-[var(--s2ee-border)] bg-[var(--s2ee-surface-soft)] shadow-none"
                  id="edit-company-name"
                  onChange={(event) => {
                    setEditingCompany((current) =>
                      current == null ? null : { ...current, name: event.target.value },
                    );
                  }}
                  placeholder={editingCompany?.name ?? ""}
                  value={editingCompany?.name ?? ""}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-account-email">Email</Label>
                <Input
                  className="rounded-none border-[var(--s2ee-border)] bg-[var(--s2ee-surface-soft)] shadow-none"
                  id="edit-account-email"
                  inputMode="email"
                  onChange={(event) => {
                    setEditingCompany((current) =>
                      current == null ? null : { ...current, email: event.target.value },
                    );
                  }}
                  placeholder={editingCompany?.email ?? ""}
                  type="email"
                  value={editingCompany?.email ?? ""}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-account-password">Nouveau mot de passe</Label>
                <Input
                  className="rounded-none border-[var(--s2ee-border)] bg-[var(--s2ee-surface-soft)] shadow-none"
                  id="edit-account-password"
                  onChange={(event) => {
                    setEditingCompany((current) =>
                      current == null ? null : { ...current, password: event.target.value },
                    );
                  }}
                  placeholder="Laisser vide pour ne pas changer"
                  type="password"
                  value={editingCompany?.password ?? ""}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-logo-url">Logo URL</Label>
                <Input
                  className="rounded-none border-[var(--s2ee-border)] bg-[var(--s2ee-surface-soft)] shadow-none"
                  id="edit-logo-url"
                  onChange={(event) => {
                    setEditingCompany((current) =>
                      current == null ? null : { ...current, logoUrl: event.target.value },
                    );
                  }}
                  placeholder="https://..."
                  value={editingCompany?.logoUrl ?? ""}
                />
              </div>
              <div className="grid gap-5 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="edit-zone-code">Zone</Label>
                  <Input
                    className="rounded-none border-[var(--s2ee-border)] bg-[var(--s2ee-surface-soft)] shadow-none"
                    id="edit-zone-code"
                    onChange={(event) => {
                      setEditingCompany((current) =>
                        current == null ? null : { ...current, zoneCode: event.target.value },
                      );
                    }}
                    placeholder="NS"
                    value={editingCompany?.zoneCode ?? ""}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-room-code">Salle</Label>
                  <Input
                    className="rounded-none border-[var(--s2ee-border)] bg-[var(--s2ee-surface-soft)] shadow-none"
                    id="edit-room-code"
                    onChange={(event) => {
                      setEditingCompany((current) =>
                        current == null ? null : { ...current, roomCode: event.target.value },
                      );
                    }}
                    placeholder="NS24"
                    value={editingCompany?.roomCode ?? ""}
                  />
                </div>
              </div>
            </form>
          </DialogPanel>

          <DialogFooter className="items-center border-t bg-[var(--s2ee-surface-soft)] px-5 py-4 sm:px-8 [border-color:var(--s2ee-border)]">
            <Button
              className="w-full sm:w-auto"
              disabled={isEditingCompany}
              form="edit-company-form"
              type="submit"
            >
              {isEditingCompany ? "Enregistrement..." : "Enregistrer"}
            </Button>
          </DialogFooter>
        </DialogPopup>
      </Dialog>
    </div>
  );
}
