"use client";

import { useAtomRefresh, useAtomSet } from "@effect/atom-react";
import { useAtomValue } from "@effect/atom-react";
import * as AsyncResult from "effect/unstable/reactivity/AsyncResult";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@project/ui/components/tabs";
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
import { describeAdminPlacement, filterAdminCompanyLedger } from "@/lib/admin-workspace";

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

const arrivalBadgeVariant = (
  status: "arrived" | "not-arrived",
): React.ComponentProps<typeof Badge>["variant"] => (status === "arrived" ? "success" : "outline");

const countFeaturedOffers = (company: {
  readonly employmentCount: number;
  readonly workerInternshipCount: number;
  readonly practicalInternshipCount: number;
  readonly pfeCount: number;
}): number =>
  company.employmentCount +
  company.workerInternshipCount +
  company.practicalInternshipCount +
  company.pfeCount;

export function AdminCompaniesPage(): React.ReactElement {
  const companyLedgerState = useAdminCompanyLedgerState();
  const accessLedgerState = useAdminAccessLedgerState();
  const refreshCompanyLedger = useAtomRefresh(adminWorkspaceAtoms.companyLedger);
  const featuredCompaniesResult = useAtomValue(adminWorkspaceAtoms.featuredCompanies);
  const refreshFeaturedCompanies = useAtomRefresh(adminWorkspaceAtoms.featuredCompanies);
  const refreshAccessLedger = useAtomRefresh(adminWorkspaceAtoms.accessLedger);
  const createCompanyAccount = useAtomSet(adminWorkspaceAtoms.createCompanyAccount, {
    mode: "promise",
  });
  const upsertFeaturedCompany = useAtomSet(adminWorkspaceAtoms.upsertFeaturedCompany, {
    mode: "promise",
  });
  const deleteFeaturedCompany = useAtomSet(adminWorkspaceAtoms.deleteFeaturedCompany, {
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
  });
  const [featuredState, setFeaturedState] = useState({
    id: null as string | null,
    name: "",
    description: "",
    logoLabel: "",
    profiles: "",
    employmentCount: "0",
    workerInternshipCount: "0",
    practicalInternshipCount: "0",
    pfeCount: "0",
    sortOrder: "0",
    isPublished: true,
  });
  const [createError, setCreateError] = useState<string | null>(null);
  const [createMessage, setCreateMessage] = useState<string | null>(null);
  const [isCreatingCompanyAccount, setIsCreatingCompanyAccount] = useState(false);
  const [featuredMessage, setFeaturedMessage] = useState<string | null>(null);
  const [featuredError, setFeaturedError] = useState<string | null>(null);
  const [isSavingFeaturedCompany, setIsSavingFeaturedCompany] = useState(false);

  const companyLedger = companyLedgerState.kind === "success" ? companyLedgerState.value : [];
  const arrivedCount = companyLedger.filter((entry) => entry.arrivalStatus === "arrived").length;
  const ownersByCompanyId = useMemo(
    () =>
      new Map(
        (accessLedgerState.kind === "success" ? accessLedgerState.value : []).flatMap((entry) =>
          entry.company == null
            ? []
            : [[entry.company.id as string, { email: entry.user.email, name: entry.user.name }]],
        ),
      ),
    [accessLedgerState],
  );
  const visibleCompanies = filterAdminCompanyLedger(companyLedger, {
    query: useDeferredValue(companyQuery),
    arrival: companyArrivalFilter,
    placement: companyPlacementFilter,
  });
  const featuredCompanies = AsyncResult.isSuccess(featuredCompaniesResult)
    ? featuredCompaniesResult.value
    : [];
  const publishedFeaturedCount = featuredCompanies.filter((entry) => entry.isPublished).length;
  const planReadyCount = companyLedger.filter((entry) => entry.room != null).length;
  const planPendingCount = companyLedger.length - planReadyCount;

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

  const resetFeaturedState = () => {
    setFeaturedState({
      id: null,
      name: "",
      description: "",
      logoLabel: "",
      profiles: "",
      employmentCount: "0",
      workerInternshipCount: "0",
      practicalInternshipCount: "0",
      pfeCount: "0",
      sortOrder: "0",
      isPublished: true,
    });
  };

  const handleSaveFeaturedCompany = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const profiles = featuredState.profiles
      .split("\n")
      .map((profile) => profile.trim())
      .filter(Boolean);
    const counts = {
      employmentCount: Number(featuredState.employmentCount),
      workerInternshipCount: Number(featuredState.workerInternshipCount),
      practicalInternshipCount: Number(featuredState.practicalInternshipCount),
      pfeCount: Number(featuredState.pfeCount),
      sortOrder: Number(featuredState.sortOrder),
    };

    if (
      featuredState.name.trim().length === 0 ||
      Object.values(counts).some((value) => !Number.isInteger(value) || value < 0)
    ) {
      setFeaturedError("Renseignez le nom et des nombres valides.");
      setFeaturedMessage(null);
      return;
    }

    setFeaturedError(null);
    setFeaturedMessage(null);
    setIsSavingFeaturedCompany(true);

    try {
      await upsertFeaturedCompany({
        payload: {
          id: featuredState.id,
          name: featuredState.name.trim(),
          description: featuredState.description.trim(),
          logoLabel: featuredState.logoLabel.trim(),
          profiles,
          ...counts,
          isPublished: featuredState.isPublished,
        },
        reactivityKeys: {
          featuredCompanies: adminWorkspaceReactivity.featuredCompanies,
        },
      });
      refreshFeaturedCompanies();
      resetFeaturedState();
      setFeaturedMessage("Entreprise mise a jour sur la landing page.");
    } catch (error) {
      setFeaturedError(formatAdminMutationError(error));
    } finally {
      setIsSavingFeaturedCompany(false);
    }
  };

  return (
    <div className="space-y-8">
      <AdminPageHeader description="" eyebrow="Admin" title="Entreprises" />

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

      {featuredMessage ? (
        <Alert>
          <BadgeCheckIcon className="size-4" />
          <AlertTitle>Landing mise a jour</AlertTitle>
          <AlertDescription>{featuredMessage}</AlertDescription>
        </Alert>
      ) : null}

      {featuredError ? (
        <Alert variant="error">
          <CircleAlertIcon className="size-4" />
          <AlertTitle>Echec de publication</AlertTitle>
          <AlertDescription>{featuredError}</AlertDescription>
        </Alert>
      ) : null}

      <Tabs className="gap-6" defaultValue="landing">
        <TabsList className="w-full justify-start overflow-x-auto rounded-none border border-[var(--s2ee-border)] bg-[var(--s2ee-surface-soft)] p-1">
          <TabsTrigger value="landing">Landing Page</TabsTrigger>
          <TabsTrigger value="plan">Plan & comptes</TabsTrigger>
        </TabsList>

        <TabsContent value="landing">
          <section className="mb-6 grid gap-px border border-[var(--s2ee-border)] bg-[var(--s2ee-border)] md:grid-cols-3">
            {[
              ["Fiches landing", featuredCompanies.length],
              ["Publiees", publishedFeaturedCount],
              ["Brouillons", featuredCompanies.length - publishedFeaturedCount],
            ].map(([label, value]) => (
              <div className="bg-white p-5" key={label}>
                <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[color:var(--s2ee-muted-foreground)]">
                  {label}
                </p>
                <p className="mt-4 text-4xl font-black tracking-[-0.08em] text-slate-900">
                  {value}
                </p>
              </div>
            ))}
          </section>

          <section className="grid gap-6 xl:grid-cols-[420px_minmax(0,1fr)]">
            <form
              className="space-y-5 border border-[var(--s2ee-border)] bg-white p-5 sm:p-6"
              onSubmit={handleSaveFeaturedCompany}
            >
              <div className="space-y-2 border-b border-[var(--s2ee-border)] pb-5">
                <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-[color:var(--s2ee-muted-foreground)]">
                  Fiche publique
                </p>
                <h2 className="text-2xl font-black tracking-[-0.07em] text-slate-900">
                  {featuredState.id == null
                    ? "Nouvelle entreprise affichee"
                    : "Modifier l'entreprise"}
                </h2>
                <p className="text-sm leading-6 text-[color:var(--s2ee-muted-foreground)]">
                  Seul le nom est obligatoire. Les profils, offres et descriptions peuvent etre
                  ajoutes quand ils sont prets.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="featured-company-name">Nom public</Label>
                <Input
                  autoComplete="off"
                  className="border-[var(--s2ee-border)] bg-[var(--s2ee-surface-soft)] shadow-none"
                  id="featured-company-name"
                  name="featured-company-name"
                  onChange={(event) => {
                    setFeaturedState((current) => ({ ...current, name: event.target.value }));
                  }}
                  placeholder="Ex. Eurl Yassir…"
                  value={featuredState.name}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="featured-company-logo">Logo texte</Label>
                <Input
                  autoComplete="off"
                  className="border-[var(--s2ee-border)] bg-[var(--s2ee-surface-soft)] shadow-none"
                  id="featured-company-logo"
                  name="featured-company-logo"
                  onChange={(event) => {
                    setFeaturedState((current) => ({ ...current, logoLabel: event.target.value }));
                  }}
                  placeholder="Ex. Yassir…"
                  value={featuredState.logoLabel}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="featured-company-description">Description courte</Label>
                <textarea
                  autoComplete="off"
                  className="min-h-28 w-full border border-[var(--s2ee-border)] bg-[var(--s2ee-surface-soft)] px-3 py-2 text-sm shadow-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:outline-none"
                  id="featured-company-description"
                  name="featured-company-description"
                  onChange={(event) => {
                    setFeaturedState((current) => ({
                      ...current,
                      description: event.target.value,
                    }));
                  }}
                  placeholder="Ex. Equipe produit, cloud et data…"
                  value={featuredState.description}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="featured-company-profiles">Profils recherches</Label>
                <textarea
                  autoComplete="off"
                  className="min-h-32 w-full border border-[var(--s2ee-border)] bg-[var(--s2ee-surface-soft)] px-3 py-2 text-sm shadow-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:outline-none"
                  id="featured-company-profiles"
                  name="featured-company-profiles"
                  onChange={(event) => {
                    setFeaturedState((current) => ({ ...current, profiles: event.target.value }));
                  }}
                  placeholder={"Ex. Developpement Web…\nEx. Developpement Mobile…"}
                  value={featuredState.profiles}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                {[
                  ["Emplois", "employmentCount"],
                  ["Stages ouvriers", "workerInternshipCount"],
                  ["Stages pratiques", "practicalInternshipCount"],
                  ["PFE", "pfeCount"],
                  ["Ordre", "sortOrder"],
                ].map(([label, key]) => (
                  <div className="space-y-2" key={key}>
                    <Label htmlFor={`featured-company-${key}`}>{label}</Label>
                    <Input
                      className="border-[var(--s2ee-border)] bg-[var(--s2ee-surface-soft)] shadow-none"
                      id={`featured-company-${key}`}
                      inputMode="numeric"
                      min={0}
                      name={`featured-company-${key}`}
                      onChange={(event) => {
                        setFeaturedState((current) => ({ ...current, [key]: event.target.value }));
                      }}
                      type="number"
                      value={featuredState[key as keyof typeof featuredState] as string}
                    />
                  </div>
                ))}
              </div>

              <label className="flex items-center gap-3 text-sm font-bold text-slate-900">
                <input
                  checked={featuredState.isPublished}
                  onChange={(event) => {
                    setFeaturedState((current) => ({
                      ...current,
                      isPublished: event.target.checked,
                    }));
                  }}
                  type="checkbox"
                />
                Publier sur la landing page
              </label>

              <div className="flex gap-3">
                <Button className="s2ee-command" disabled={isSavingFeaturedCompany} type="submit">
                  {isSavingFeaturedCompany ? "Enregistrement…" : "Enregistrer la fiche"}
                </Button>
                <Button
                  className="s2ee-command"
                  onClick={resetFeaturedState}
                  type="button"
                  variant="outline"
                >
                  Nouveau
                </Button>
              </div>
            </form>

            <div className="space-y-3">
              {featuredCompanies.length === 0 ? (
                <div className="border border-dashed border-[var(--s2ee-border)] bg-white p-6">
                  <p className="text-sm leading-6 text-[color:var(--s2ee-soft-foreground)]">
                    Aucune entreprise n'est encore configuree pour la landing page.
                  </p>
                </div>
              ) : (
                featuredCompanies.map((entry) => (
                  <div className="border border-[var(--s2ee-border)] bg-white p-5" key={entry.id}>
                    <div className="flex items-start justify-between gap-5">
                      <div>
                        <p className="text-xl font-black tracking-[-0.06em] text-slate-900">
                          {entry.name}
                        </p>
                        {entry.description.length > 0 ? (
                          <p className="mt-2 text-sm leading-6 text-[color:var(--s2ee-muted-foreground)]">
                            {entry.description}
                          </p>
                        ) : null}
                      </div>
                      <Badge variant={entry.isPublished ? "success" : "outline"}>
                        {entry.isPublished ? "Publiee" : "Brouillon"}
                      </Badge>
                    </div>
                    <div className="mt-4 flex flex-wrap gap-2">
                      <Badge variant="outline">
                        {entry.profiles.length} profil{entry.profiles.length === 1 ? "" : "s"}
                      </Badge>
                      <Badge variant="outline">
                        {countFeaturedOffers(entry)} offre
                        {countFeaturedOffers(entry) === 1 ? "" : "s"}
                      </Badge>
                      <Badge variant="outline">Ordre {entry.sortOrder}</Badge>
                    </div>
                    <div className="mt-4 flex flex-wrap gap-2">
                      <Button
                        className="s2ee-command"
                        onClick={() => {
                          setFeaturedState({
                            id: entry.id,
                            name: entry.name,
                            description: entry.description,
                            logoLabel: entry.logoLabel,
                            profiles: entry.profiles.join("\n"),
                            employmentCount: String(entry.employmentCount),
                            workerInternshipCount: String(entry.workerInternshipCount),
                            practicalInternshipCount: String(entry.practicalInternshipCount),
                            pfeCount: String(entry.pfeCount),
                            sortOrder: String(entry.sortOrder),
                            isPublished: entry.isPublished,
                          });
                        }}
                        type="button"
                        variant="outline"
                      >
                        Modifier
                      </Button>
                      <Button
                        className="s2ee-command"
                        onClick={async () => {
                          const confirmed = window.confirm(
                            `Supprimer ${entry.name} de la landing page ?`,
                          );

                          if (!confirmed) {
                            return;
                          }

                          await deleteFeaturedCompany({
                            payload: { id: entry.id },
                            reactivityKeys: {
                              featuredCompanies: adminWorkspaceReactivity.featuredCompanies,
                            },
                          });
                          refreshFeaturedCompanies();
                        }}
                        type="button"
                        variant="outline"
                      >
                        Supprimer
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>
        </TabsContent>

        <TabsContent value="plan">
          <section className="grid gap-px border border-[var(--s2ee-border)] bg-[var(--s2ee-border)] md:grid-cols-4">
            {[
              ["Comptes plan", companyLedger.length],
              ["Pretes plan", planReadyCount],
              ["A placer", planPendingCount],
              ["Arrivees", arrivedCount],
            ].map(([label, value]) => (
              <div className="bg-white p-5" key={label}>
                <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[color:var(--s2ee-muted-foreground)]">
                  {label}
                </p>
                <p className="mt-4 text-4xl font-black tracking-[-0.08em] text-slate-900">
                  {value}
                </p>
              </div>
            ))}
          </section>

          <div className="grid gap-6 xl:grid-cols-[380px_minmax(0,1fr)]">
            <section className="space-y-6 border border-[var(--s2ee-border)] bg-white p-5 sm:p-6">
              <div className="space-y-2 border-b border-[var(--s2ee-border)] pb-5">
                <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-[color:var(--s2ee-muted-foreground)]">
                  Entreprise du plan
                </p>
                <h2 className="text-2xl font-black tracking-[-0.07em] text-slate-900">
                  Creer un compte entreprise
                </h2>
                <p className="text-sm leading-6 text-[color:var(--s2ee-muted-foreground)]">
                  Ces champs sont requis parce qu'une entreprise du plan a besoin d'un acces pour
                  ses recruteurs.
                </p>
              </div>

              <form className="space-y-5" onSubmit={handleCreateCompanyAccount}>
                <div className="space-y-2">
                  <Label htmlFor="company-name">Nom de l'entreprise</Label>
                  <Input
                    autoComplete="organization"
                    className="rounded-none border-[var(--s2ee-border)] bg-[var(--s2ee-surface-soft)] shadow-none"
                    id="company-name"
                    name="company-name"
                    onChange={(event) => {
                      setCreateState((current) => ({
                        ...current,
                        companyName: event.target.value,
                      }));
                    }}
                    placeholder="Ex. Atlas Systems…"
                    value={createState.companyName}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="account-email">Email</Label>
                  <Input
                    autoComplete="email"
                    className="rounded-none border-[var(--s2ee-border)] bg-[var(--s2ee-surface-soft)] shadow-none"
                    id="account-email"
                    inputMode="email"
                    name="account-email"
                    onChange={(event) => {
                      setCreateState((current) => ({ ...current, email: event.target.value }));
                    }}
                    placeholder="Ex. atlas@example.com…"
                    type="email"
                    value={createState.email}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="account-password">Mot de passe temporaire</Label>
                  <Input
                    autoComplete="new-password"
                    className="rounded-none border-[var(--s2ee-border)] bg-[var(--s2ee-surface-soft)] shadow-none"
                    id="account-password"
                    name="account-password"
                    onChange={(event) => {
                      setCreateState((current) => ({ ...current, password: event.target.value }));
                    }}
                    placeholder="Ex. mot de passe temporaire…"
                    type="password"
                    value={createState.password}
                  />
                </div>

                <Button className="w-full" disabled={isCreatingCompanyAccount} type="submit">
                  {isCreatingCompanyAccount ? "Creation…" : "Creer le compte entreprise"}
                </Button>
              </form>
            </section>

            <section className="space-y-6 border border-[var(--s2ee-border)] bg-white p-5 sm:p-6">
              <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_220px_220px]">
                <div className="relative">
                  <SearchIcon className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[color:var(--s2ee-muted-foreground)]" />
                  <Input
                    aria-label="Rechercher une entreprise du plan"
                    autoComplete="off"
                    className="rounded-none border-[var(--s2ee-border)] bg-[var(--s2ee-surface-soft)] pl-9 shadow-none"
                    name="admin-company-search"
                    onChange={(event) => {
                      setCompanyQuery(event.target.value);
                    }}
                    placeholder="Entreprise, salle, stand ou recruteur…"
                    value={companyQuery}
                  />
                </div>
                <Select
                  onValueChange={(value) => {
                    setCompanyArrivalFilter(
                      value as (typeof companyArrivalOptions)[number]["value"],
                    );
                  }}
                  value={companyArrivalFilter}
                >
                  <SelectTrigger
                    aria-label="Filtrer par arrivee"
                    className="rounded-none border-[var(--s2ee-border)] bg-[var(--s2ee-surface-soft)] shadow-none"
                  >
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
                    setCompanyPlacementFilter(
                      value as (typeof companyPlacementOptions)[number]["value"],
                    );
                  }}
                  value={companyPlacementFilter}
                >
                  <SelectTrigger
                    aria-label="Filtrer par placement"
                    className="rounded-none border-[var(--s2ee-border)] bg-[var(--s2ee-surface-soft)] shadow-none"
                  >
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

              {companyLedgerState.kind === "loading" || accessLedgerState.kind === "loading" ? (
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
                      Modifiez les filtres d'arrivee ou de placement.
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
                                {owner == null ? "Aucun compte lie" : owner.email}
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
                        </div>
                      );
                    })}
                  </div>
                </>
              ) : null}
            </section>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
