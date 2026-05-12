"use client";

import { useAtomRefresh, useAtomSet, useAtomValue } from "@effect/atom-react";
import * as AsyncResult from "effect/unstable/reactivity/AsyncResult";
import { Alert, AlertDescription, AlertTitle } from "@project/ui/components/alert";
import { Button } from "@project/ui/components/button";
import {
  Dialog,
  DialogHeader,
  DialogPanel,
  DialogPopup,
  DialogTitle,
} from "@project/ui/components/dialog";
import { Input } from "@project/ui/components/input";
import { Popover, PopoverPopup, PopoverTrigger } from "@project/ui/components/popover";
import { Skeleton } from "@project/ui/components/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@project/ui/components/table";
import type { Company, Interview, PresentedCvProfilePreview, Recruiter } from "@project/domain";
import QrScanner from "qr-scanner";
import qrScannerWorkerUrl from "qr-scanner/qr-scanner-worker.min.js?url";
import { useNavigate } from "@tanstack/react-router";
import {
  ArrowRightIcon,
  CameraIcon,
  CheckIcon,
  ChevronDownIcon,
  CircleAlertIcon,
  DownloadIcon,
  ListFilterIcon,
  LogOutIcon,
  QrCodeIcon,
  ScanLineIcon,
  SearchIcon,
  UserPlusIcon,
} from "lucide-react";
import type React from "react";
import {
  startTransition,
  useCallback,
  useDeferredValue,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { AppIslandNavbar } from "@/components/app-island-navbar";
import { authClient } from "@/lib/auth-client";
import { companyWorkspaceAtoms, companyWorkspaceReactivity } from "@/lib/company-atoms";
import {
  canConfirmInterviewStart,
  companyPreferredRecruiterStorageKey,
  normalizeStudentQrIdentityInput,
  resolveInterviewStartRecruiterId,
} from "@/lib/company-interview-start";
import {
  buildCompanyInterviewListRows,
  collectCompanyInterviewListTagFilters,
  filterCompanyInterviewListRows,
  type CompanyInterviewListRow,
} from "@/lib/company-interviews";

type AsyncPanelState<Value> =
  | { readonly kind: "loading" }
  | { readonly kind: "failure"; readonly message: string }
  | { readonly kind: "success"; readonly value: Value };

type SessionLike = {
  readonly user?: {
    readonly name?: string | null;
  } | null;
};

type CompanySubview = "scan" | "interviews";
type InterviewStatusFilter = "all" | "active" | "completed";

QrScanner.WORKER_PATH = qrScannerWorkerUrl;

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

const downloadBase64File = (input: {
  readonly contentsBase64: string;
  readonly contentType: string;
  readonly fileName: string;
}) => {
  const binary = window.atob(input.contentsBase64);
  const bytes = new Uint8Array(binary.length);

  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }

  const url = window.URL.createObjectURL(
    new Blob([bytes], {
      type: input.contentType,
    }),
  );
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = input.fileName;
  anchor.click();
  window.URL.revokeObjectURL(url);
};

export function CompanyWorkspace({
  initialSubview = "scan",
}: {
  readonly initialSubview?: CompanySubview;
} = {}): React.ReactElement {
  const navigate = useNavigate();
  const [activeSubview, setActiveSubview] = useState<CompanySubview>(initialSubview);
  const [interviewQuery, setInterviewQuery] = useState("");
  const [interviewStatus, setInterviewStatus] = useState<InterviewStatusFilter>("all");
  const [interviewTagFilter, setInterviewTagFilter] = useState<string | null>(null);
  const [submittedCode, setSubmittedCode] = useState<string | null>(null);
  const [codeDraft, setCodeDraft] = useState("");
  const [isCandidatePreviewOpen, setIsCandidatePreviewOpen] = useState(false);
  const [preferredRecruiterId, setPreferredRecruiterId] = useState<Recruiter["id"] | null>(null);
  const [selectedRecruiterId, setSelectedRecruiterId] = useState<Recruiter["id"] | null>(null);
  const [accountName, setAccountName] = useState<string>("Compte entreprise");
  const [pageMessage, setPageMessage] = useState<string | null>(null);
  const [pageError, setPageError] = useState<string | null>(null);
  const [isStartingInterview, setIsStartingInterview] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [isExportingInterviews, setIsExportingInterviews] = useState(false);
  const [hadNoRecruitersOnLoad, setHadNoRecruitersOnLoad] = useState(false);
  const [hasCompletedRecruiterOnboarding, setHasCompletedRecruiterOnboarding] = useState(false);
  const deferredInterviewQuery = useDeferredValue(interviewQuery);

  const currentCompanyResult = useAtomValue(companyWorkspaceAtoms.currentCompany);
  const activeInterviewsResult = useAtomValue(companyWorkspaceAtoms.activeInterviewDetails);
  const completedInterviewsResult = useAtomValue(companyWorkspaceAtoms.completedInterviews);
  const refreshCompany = useAtomRefresh(companyWorkspaceAtoms.currentCompany);
  const addRecruiter = useAtomSet(companyWorkspaceAtoms.addRecruiter, {
    mode: "promise",
  });
  const startInterview = useAtomSet(companyWorkspaceAtoms.startInterview, {
    mode: "promise",
  });
  const exportCompletedInterviews = useAtomSet(companyWorkspaceAtoms.exportCompletedInterviews, {
    mode: "promise",
  });

  const companyState = toAsyncPanelState(
    currentCompanyResult,
    "Les informations de l'entreprise n'ont pas pu etre chargees.",
  );
  const company = companyState.kind === "success" ? companyState.value : null;
  const activeInterviewsState = toAsyncPanelState(
    activeInterviewsResult,
    "La liste des entretiens en cours n'a pas pu etre chargee.",
  );
  const completedInterviewsState = toAsyncPanelState(
    completedInterviewsResult,
    "La liste des entretiens termines n'a pas pu etre chargee.",
  );
  const recruiters = company?.recruiters ?? [];
  const selectedRecruiter =
    recruiters.find((recruiter) => recruiter.id === selectedRecruiterId) ?? null;
  const companyLabel = company?.name ?? accountName;
  const allInterviewRows =
    activeInterviewsState.kind === "success" && completedInterviewsState.kind === "success"
      ? buildCompanyInterviewListRows({
          activeInterviews: activeInterviewsState.value,
          completedInterviews: completedInterviewsState.value,
        })
      : [];
  const visibleInterviewRows = filterCompanyInterviewListRows(allInterviewRows, {
    query: deferredInterviewQuery,
    status: interviewStatus,
    tag: interviewTagFilter,
  });
  const interviewTagFilters = collectCompanyInterviewListTagFilters(allInterviewRows);
  const interviewStatusFilters: ReadonlyArray<{
    readonly value: InterviewStatusFilter;
    readonly label: string;
    readonly count: number;
  }> = [
    { value: "all", label: "Tous", count: allInterviewRows.length },
    {
      value: "active",
      label: "En cours",
      count: allInterviewRows.filter((row) => row.kind === "active").length,
    },
    {
      value: "completed",
      label: "Termines",
      count: allInterviewRows.filter((row) => row.kind === "completed").length,
    },
  ];

  useEffect(() => {
    void authClient.getSession().then((session) => {
      const name = (session.data as SessionLike | null)?.user?.name?.trim() ?? "";

      if (name.length > 0) {
        setAccountName(name);
      }
    });
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    setPreferredRecruiterId(
      window.localStorage.getItem(companyPreferredRecruiterStorageKey) as Recruiter["id"] | null,
    );
  }, []);

  useEffect(() => {
    if (companyState.kind !== "success") {
      return;
    }

    if (recruiters.length === 0) {
      setHadNoRecruitersOnLoad(true);
      setHasCompletedRecruiterOnboarding(false);
    }
  }, [companyState.kind, recruiters.length]);

  useEffect(() => {
    const recruiterId = resolveInterviewStartRecruiterId({
      recruiters,
      preferredRecruiterId,
      selectedRecruiterId,
    });

    if (recruiterId !== selectedRecruiterId) {
      setSelectedRecruiterId(recruiterId);
    }
  }, [preferredRecruiterId, recruiters, selectedRecruiterId]);

  const needsRecruiterOnboarding =
    company != null &&
    (recruiters.length === 0 ||
      selectedRecruiter == null ||
      (hadNoRecruitersOnLoad && !hasCompletedRecruiterOnboarding));

  const rememberRecruiter = (recruiterId: Recruiter["id"]) => {
    startTransition(() => {
      setSelectedRecruiterId(recruiterId);
      setPreferredRecruiterId(recruiterId);
      setPageError(null);
    });

    if (typeof window !== "undefined") {
      window.localStorage.setItem(companyPreferredRecruiterStorageKey, recruiterId);
    }
  };

  const resetCandidate = () => {
    setSubmittedCode(null);
    setCodeDraft("");
    setIsCandidatePreviewOpen(false);
    setPageError(null);
    setPageMessage(null);
  };

  const addRecruiterByName = async (name: string): Promise<Recruiter | null> => {
    if (company == null) {
      setPageError("Ce compte n'est pas encore lie a une entreprise.");
      return null;
    }

    if (name.length === 0) {
      setPageError("Le nom du recruteur est obligatoire.");
      return null;
    }

    setPageError(null);
    setPageMessage(null);

    try {
      const existingRecruiterIds = new Set(recruiters.map((recruiter) => recruiter.id));
      const updatedCompany = (await addRecruiter({
        payload: { name },
        reactivityKeys: companyWorkspaceReactivity.currentCompany,
      })) as Company;
      const addedRecruiter =
        updatedCompany.recruiters.find((recruiter) => !existingRecruiterIds.has(recruiter.id)) ??
        updatedCompany.recruiters.find((recruiter) => recruiter.name === name) ??
        null;

      if (addedRecruiter != null) {
        rememberRecruiter(addedRecruiter.id);
      }

      setPageMessage(`Recruteur ${name} ajoute.`);
      refreshCompany();

      return addedRecruiter;
    } catch (error) {
      setPageError(formatMutationError(error));
      return null;
    }
  };

  const submitCandidateCode = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const normalizedCode = normalizeStudentQrIdentityInput(codeDraft);

    if (normalizedCode.length === 0) {
      setPageError("Scannez ou saisissez un code a 6 caracteres.");
      return;
    }

    setPageError(null);
    setPageMessage(null);
    setSubmittedCode(normalizedCode);
    setCodeDraft(normalizedCode);
    setIsCandidatePreviewOpen(true);
  };

  const applyDetectedCode = useCallback((value: string) => {
    const normalizedCode = normalizeStudentQrIdentityInput(value);

    if (normalizedCode.length === 0) {
      return;
    }

    setPageError(null);
    setPageMessage(null);
    setCodeDraft(normalizedCode);
    setSubmittedCode(normalizedCode);
    setIsCandidatePreviewOpen(true);
  }, []);

  const beginInterview = async (candidatePreview: PresentedCvProfilePreview) => {
    if (company == null) {
      setPageError("Ce compte n'est pas encore lie a une entreprise.");
      return;
    }

    if (!selectedRecruiter) {
      setPageError("Selectionnez un recruteur avant de demarrer l'entretien.");
      return;
    }

    setIsStartingInterview(true);
    setPageError(null);
    setPageMessage(null);

    try {
      const interview = await startInterview({
        payload: {
          recruiterId: selectedRecruiter.id,
          presentationIdentity: candidatePreview.cvProfile.presentationCode,
        },
        reactivityKeys: {
          activeInterviews: companyWorkspaceReactivity.activeInterviews,
          completedInterviews: companyWorkspaceReactivity.completedInterviews,
        },
      });

      await navigate({
        to: "/company/interviews/$interviewId",
        params: { interviewId: interview.id },
      });
    } catch (error) {
      setPageError(formatMutationError(error));
    } finally {
      setIsStartingInterview(false);
    }
  };

  const handleSignOut = async () => {
    setIsSigningOut(true);

    try {
      await authClient.signOut();
      await navigate({ replace: true, to: "/" });
    } finally {
      setIsSigningOut(false);
    }
  };

  const exportInterviewArchive = async () => {
    setIsExportingInterviews(true);
    setPageError(null);
    setPageMessage(null);

    try {
      const exportFile = await exportCompletedInterviews({
        payload: {
          includeCvFiles: true,
        },
        reactivityKeys: {
          completedInterviews: companyWorkspaceReactivity.completedInterviews,
        },
      });

      downloadBase64File(exportFile);
      setPageMessage("Export des entretiens prepare.");
    } catch (error) {
      setPageError(formatMutationError(error));
    } finally {
      setIsExportingInterviews(false);
    }
  };

  return (
    <main className="s2ee-workspace-page">
      <AppIslandNavbar
        action={
          <Button
            className="rounded-[8px] border-[var(--s2ee-border)] bg-[var(--s2ee-surface)] px-3 text-sm font-bold text-[color:var(--s2ee-soft-foreground)] shadow-none hover:bg-white sm:px-4"
            loading={isSigningOut}
            onClick={handleSignOut}
            size="sm"
            type="button"
            variant="outline"
          >
            <LogOutIcon />
            Se deconnecter
          </Button>
        }
      />

      <div className="mx-auto grid max-w-5xl gap-6 px-4 py-6 sm:px-6 sm:py-8">
        <header className="grid gap-4 border-b border-[var(--s2ee-border)] pb-5">
          <div className="flex items-center gap-4">
            <CompanyLogo company={company} companyLabel={companyLabel} />
            <h1 className="text-4xl font-black leading-none text-[color:var(--s2ee-soft-foreground)] sm:text-5xl">
              {companyLabel}
            </h1>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              className={[
                "rounded-[8px] border-[var(--s2ee-border)] px-3 text-sm font-bold shadow-none hover:bg-white sm:px-4",
                activeSubview === "scan"
                  ? "bg-primary text-primary-foreground"
                  : "bg-[var(--s2ee-surface)] text-[color:var(--s2ee-soft-foreground)]",
              ].join(" ")}
              onClick={() => setActiveSubview("scan")}
              size="sm"
              type="button"
              variant="outline"
            >
              <ScanLineIcon />
              Scan
            </Button>
            <Button
              className={[
                "rounded-[8px] border-[var(--s2ee-border)] px-3 text-sm font-bold shadow-none hover:bg-white sm:px-4",
                activeSubview === "interviews"
                  ? "bg-primary text-primary-foreground"
                  : "bg-[var(--s2ee-surface)] text-[color:var(--s2ee-soft-foreground)]",
              ].join(" ")}
              onClick={() => setActiveSubview("interviews")}
              size="sm"
              type="button"
              variant="outline"
            >
              <ArrowRightIcon />
              Entretiens
            </Button>
          </div>
        </header>

        {pageMessage != null ? (
          <Alert>
            <AlertTitle>Mise a jour</AlertTitle>
            <AlertDescription>{pageMessage}</AlertDescription>
          </Alert>
        ) : null}

        {pageError != null ? (
          <Alert variant="error">
            <CircleAlertIcon className="size-4" />
            <AlertTitle>Echec de mise a jour</AlertTitle>
            <AlertDescription>{pageError}</AlertDescription>
          </Alert>
        ) : null}

        {needsRecruiterOnboarding ? (
          <RecruiterOnboardingPanel
            addRecruiter={addRecruiterByName}
            companyLabel={companyLabel}
            onContinue={() => {
              if (selectedRecruiter == null) {
                setPageError("Selectionnez un recruteur avant de continuer.");
                return;
              }

              setHasCompletedRecruiterOnboarding(true);
              setHadNoRecruitersOnLoad(false);
              setPageError(null);
            }}
            onSelectRecruiter={rememberRecruiter}
            recruiters={recruiters}
            selectedRecruiterId={selectedRecruiterId}
          />
        ) : null}

        {activeSubview === "scan" ? (
          <div
            className={[
              "s2ee-data-plane grid lg:grid-cols-[minmax(0,1fr)_22rem]",
              needsRecruiterOnboarding ? "pointer-events-none opacity-35" : "",
            ].join(" ")}
          >
            <section className="grid gap-4 border-b border-[var(--s2ee-border)] bg-[var(--s2ee-surface-soft)] p-6 lg:border-r lg:border-b-0">
              <CameraScanner onDetected={applyDetectedCode} />
            </section>

            <section className="flex min-h-full flex-col gap-5 p-6">
              <div className="space-y-2">
                <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-primary">
                  Code manuel
                </p>
                <p className="text-sm leading-6 text-[color:var(--s2ee-muted-foreground)]">
                  Utilisez cette alternative si le QR code ne passe pas a la camera.
                </p>
              </div>

              <form className="grid gap-4" onSubmit={submitCandidateCode}>
                <div className="grid gap-2">
                  <label
                    className="text-[11px] font-bold uppercase tracking-[0.22em] text-[color:var(--s2ee-muted-foreground)]"
                    htmlFor="company-manual-code"
                  >
                    Code candidat
                  </label>
                  <Input
                    id="company-manual-code"
                    className="h-14 rounded-[8px] border-[var(--s2ee-border)] bg-[var(--s2ee-surface-soft)] px-4 text-lg font-black uppercase tracking-[0.16em] shadow-none"
                    inputMode="text"
                    maxLength={6}
                    nativeInput
                    onChange={(event) => {
                      const nextValue = event.currentTarget.value
                        .replace(/[^a-zA-Z0-9]/g, "")
                        .toUpperCase();
                      setCodeDraft(nextValue);
                    }}
                    pattern="[A-Za-z0-9]*"
                    placeholder="ABC123"
                    value={codeDraft}
                  />
                </div>
                <div className="grid gap-2 sm:grid-cols-2">
                  <Button
                    className="s2ee-command rounded-[var(--s2ee-control-radius)]"
                    type="submit"
                  >
                    Rechercher
                  </Button>
                  <Button
                    className="s2ee-command rounded-[var(--s2ee-control-radius)]"
                    onClick={resetCandidate}
                    type="button"
                    variant="outline"
                  >
                    Effacer
                  </Button>
                </div>
              </form>

              <RecruiterDropdown
                addRecruiter={addRecruiterByName}
                onSelectRecruiter={rememberRecruiter}
                recruiters={recruiters}
                selectedRecruiter={selectedRecruiter}
                selectedRecruiterId={selectedRecruiterId}
              />
            </section>
          </div>
        ) : (
          <CompanyInterviewsSubview
            isLoading={
              activeInterviewsState.kind === "loading" ||
              completedInterviewsState.kind === "loading"
            }
            hasFailure={
              activeInterviewsState.kind === "failure" ||
              completedInterviewsState.kind === "failure"
            }
            interviewQuery={interviewQuery}
            interviewStatus={interviewStatus}
            interviewTagFilter={interviewTagFilter}
            isExporting={isExportingInterviews}
            onQueryChange={setInterviewQuery}
            onStatusChange={setInterviewStatus}
            onTagFilterChange={setInterviewTagFilter}
            onExport={exportInterviewArchive}
            rows={visibleInterviewRows}
            statusFilters={interviewStatusFilters}
            tagFilters={interviewTagFilters}
            onOpenInterview={(interviewId) =>
              navigate({
                to: "/company/interviews/$interviewId",
                params: { interviewId },
              })
            }
          />
        )}
      </div>

      <Dialog onOpenChange={setIsCandidatePreviewOpen} open={isCandidatePreviewOpen}>
        <DialogPopup className="max-w-2xl rounded-[var(--s2ee-panel-radius)]" showCloseButton>
          <DialogHeader className="border-b bg-[var(--s2ee-surface-soft)] [border-color:var(--s2ee-border)]">
            <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-primary">
              Apercu candidat
            </p>
            <DialogTitle className="text-2xl font-black tracking-[-0.04em] text-[color:var(--s2ee-soft-foreground)]">
              Confirmer l'entretien
            </DialogTitle>
          </DialogHeader>
          <DialogPanel className="p-5 sm:p-6" scrollFade={false}>
            {submittedCode == null ? (
              <EmptyPreview message="En attente d'un QR code ou d'un code a 6 caracteres." />
            ) : (
              <CandidatePreviewPanel
                companyMissing={company == null}
                isStartingInterview={isStartingInterview}
                onStartInterview={beginInterview}
                presentationCode={submittedCode}
                selectedRecruiter={selectedRecruiter}
              />
            )}
          </DialogPanel>
        </DialogPopup>
      </Dialog>
    </main>
  );
}

function CompanyLogo(props: {
  readonly company: Company | null;
  readonly companyLabel: string;
}): React.ReactElement {
  const initials =
    props.companyLabel
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? "")
      .join("") || "CO";

  return (
    <div className="grid size-16 shrink-0 place-items-center overflow-hidden rounded-[var(--s2ee-panel-radius)] border border-[var(--s2ee-border)] bg-[var(--s2ee-surface-soft)] sm:size-20">
      {props.company?.logoUrl ? (
        <img
          alt={`${props.companyLabel} logo`}
          className="size-full object-contain p-2"
          src={props.company.logoUrl}
        />
      ) : (
        <span className="text-lg font-black uppercase tracking-[0.08em] text-primary sm:text-2xl">
          {initials}
        </span>
      )}
    </div>
  );
}

function InterviewStatusFilterDropdown(props: {
  readonly filters: ReadonlyArray<{
    readonly value: InterviewStatusFilter;
    readonly label: string;
    readonly count: number;
  }>;
  readonly value: InterviewStatusFilter;
  readonly onChange: (status: InterviewStatusFilter) => void;
}): React.ReactElement {
  const [isOpen, setIsOpen] = useState(false);
  const activeFilter = props.filters.find((filter) => filter.value === props.value);

  return (
    <div className="grid gap-2">
      <span className="s2ee-index-label flex items-center gap-2">
        <ListFilterIcon className="size-3.5 text-primary" />
        Statut
      </span>
      <Popover onOpenChange={setIsOpen} open={isOpen}>
        <PopoverTrigger>
          <Button
            className="s2ee-command h-12 w-full justify-between rounded-[var(--s2ee-control-radius)]"
            type="button"
            variant="outline"
          >
            <span className="truncate text-left">
              {activeFilter == null
                ? "Statut"
                : `${activeFilter.label} (${activeFilter.count})`}
            </span>
            <ChevronDownIcon />
          </Button>
        </PopoverTrigger>
        <PopoverPopup
          align="start"
          className="w-[min(22rem,calc(100vw-2rem))] rounded-[var(--s2ee-panel-radius)] p-0"
          sideOffset={8}
        >
          <div className="grid gap-2">
            {props.filters.map((filter) => {
              const selected = props.value === filter.value;

              return (
                <button
                  className={[
                    "flex items-center justify-between gap-3 rounded-[var(--s2ee-control-radius)] border px-3 py-3 text-left transition-colors",
                    selected
                      ? "border-primary bg-[var(--s2ee-accent-wash)] text-primary"
                      : "border-[var(--s2ee-border)] bg-[var(--s2ee-surface-soft)] hover:border-primary/60",
                  ].join(" ")}
                  key={filter.value}
                  onClick={() => {
                    props.onChange(filter.value);
                    setIsOpen(false);
                  }}
                  type="button"
                >
                  <span className="truncate text-sm font-bold uppercase tracking-[0.12em]">
                    {filter.label}
                  </span>
                  <span className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.18em]">
                    {filter.count}
                    {selected ? <CheckIcon className="size-3.5" /> : null}
                  </span>
                </button>
              );
            })}
          </div>
        </PopoverPopup>
      </Popover>
    </div>
  );
}

function InterviewTagFilterDropdown(props: {
  readonly tags: ReadonlyArray<string>;
  readonly value: string | null;
  readonly onChange: (tag: string | null) => void;
}): React.ReactElement {
  const [isOpen, setIsOpen] = useState(false);
  const activeLabel = props.value ?? "Tous les tags";

  return (
    <div className="grid gap-2">
      <span className="s2ee-index-label">Tags</span>
      <Popover onOpenChange={setIsOpen} open={isOpen}>
        <PopoverTrigger>
          <Button
            className="s2ee-command h-12 w-full justify-between rounded-[var(--s2ee-control-radius)]"
            type="button"
            variant="outline"
          >
            <span className="truncate text-left">{activeLabel}</span>
            <ChevronDownIcon />
          </Button>
        </PopoverTrigger>
        <PopoverPopup
          align="start"
          className="w-[min(24rem,calc(100vw-2rem))] rounded-[var(--s2ee-panel-radius)] p-0"
          sideOffset={8}
        >
          <div className="grid max-h-80 gap-2 overflow-y-auto">
            <button
              className={[
                "flex items-center justify-between gap-3 rounded-[var(--s2ee-control-radius)] border px-3 py-3 text-left transition-colors",
                props.value == null
                  ? "border-primary bg-[var(--s2ee-accent-wash)] text-primary"
                  : "border-[var(--s2ee-border)] bg-[var(--s2ee-surface-soft)] hover:border-primary/60",
              ].join(" ")}
              onClick={() => {
                props.onChange(null);
                setIsOpen(false);
              }}
              type="button"
            >
              <span className="truncate text-sm font-bold uppercase tracking-[0.12em]">
                Tous les tags
              </span>
              {props.value == null ? <CheckIcon className="size-3.5" /> : null}
            </button>

            {props.tags.length === 0 ? (
              <p className="rounded-[var(--s2ee-control-radius)] border border-dashed border-[var(--s2ee-border)] bg-[var(--s2ee-surface-soft)] p-3 text-sm leading-6 text-[color:var(--s2ee-muted-foreground)]">
                Aucun tag entreprise pour le moment.
              </p>
            ) : (
              props.tags.map((tag) => {
                const selected = props.value === tag;

                return (
                  <button
                    className={[
                      "flex items-center justify-between gap-3 rounded-[var(--s2ee-control-radius)] border px-3 py-3 text-left transition-colors",
                      selected
                        ? "border-primary bg-[var(--s2ee-accent-wash)] text-primary"
                        : "border-[var(--s2ee-border)] bg-[var(--s2ee-surface-soft)] hover:border-primary/60",
                    ].join(" ")}
                    key={tag}
                    onClick={() => {
                      props.onChange(tag);
                      setIsOpen(false);
                    }}
                    type="button"
                  >
                    <span className="truncate text-sm font-bold uppercase tracking-[0.12em]">
                      {tag}
                    </span>
                    {selected ? <CheckIcon className="size-3.5" /> : null}
                  </button>
                );
              })
            )}
          </div>
        </PopoverPopup>
      </Popover>
    </div>
  );
}

function CompanyInterviewsSubview(props: {
  readonly hasFailure: boolean;
  readonly interviewQuery: string;
  readonly interviewStatus: InterviewStatusFilter;
  readonly interviewTagFilter: string | null;
  readonly isExporting: boolean;
  readonly isLoading: boolean;
  readonly onExport: () => void;
  readonly onOpenInterview: (interviewId: Interview["id"]) => void;
  readonly onQueryChange: (value: string) => void;
  readonly onStatusChange: (status: InterviewStatusFilter) => void;
  readonly onTagFilterChange: (tag: string | null) => void;
  readonly rows: ReadonlyArray<CompanyInterviewListRow>;
  readonly statusFilters: ReadonlyArray<{
    readonly value: InterviewStatusFilter;
    readonly label: string;
    readonly count: number;
  }>;
  readonly tagFilters: ReadonlyArray<string>;
}): React.ReactElement {
  if (props.isLoading) {
    return (
      <div className="grid gap-4">
        <Skeleton className="s2ee-skeleton h-24 rounded-[var(--s2ee-panel-radius)]" />
        <Skeleton className="s2ee-skeleton h-[34rem] rounded-[var(--s2ee-panel-radius)]" />
      </div>
    );
  }

  return (
    <section className="s2ee-data-plane">
      <div className="grid gap-4 border-b border-[var(--s2ee-border)] p-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <label className="grid min-w-[min(100%,18rem)] flex-1 gap-2">
            <span className="s2ee-index-label">Recherche</span>
            <span className="relative block">
              <SearchIcon className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[color:var(--s2ee-muted-foreground)]" />
              <Input
                className="rounded-[var(--s2ee-control-radius)] border-[var(--s2ee-border)] bg-[var(--s2ee-surface-soft)] pl-9 shadow-none"
                onChange={(event) => props.onQueryChange(event.currentTarget.value)}
                placeholder="Candidat, recruteur, tag ou note"
                value={props.interviewQuery}
              />
            </span>
          </label>

          <Button
            className="s2ee-command rounded-[var(--s2ee-control-radius)]"
            loading={props.isExporting}
            onClick={props.onExport}
            type="button"
            variant="outline"
          >
            <DownloadIcon />
            Exporter
          </Button>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:max-w-3xl">
          <InterviewStatusFilterDropdown
            filters={props.statusFilters}
            onChange={props.onStatusChange}
            value={props.interviewStatus}
          />
          <InterviewTagFilterDropdown
            onChange={props.onTagFilterChange}
            tags={props.tagFilters}
            value={props.interviewTagFilter}
          />
        </div>
      </div>

      {props.hasFailure ? (
        <div className="p-4">
          <Alert variant="error">
            <CircleAlertIcon className="size-4" />
            <AlertTitle>Entretiens indisponibles</AlertTitle>
            <AlertDescription>La liste des entretiens n'a pas pu etre chargee.</AlertDescription>
          </Alert>
        </div>
      ) : (
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
            {props.rows.length === 0 ? (
              <TableRow>
                <TableCell
                  className="px-4 py-10 text-sm text-[color:var(--s2ee-muted-foreground)]"
                  colSpan={5}
                >
                  Aucun entretien ne correspond aux filtres actuels.
                </TableCell>
              </TableRow>
            ) : (
              props.rows.map((row) => (
                <TableRow
                  className="group cursor-pointer hover:bg-[var(--s2ee-accent-wash)]"
                  key={`${row.kind}:${row.id}`}
                  onClick={() => props.onOpenInterview(row.id as Interview["id"])}
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
      )}
    </section>
  );
}

function RecruiterOnboardingPanel(props: {
  readonly addRecruiter: (name: string) => Promise<Recruiter | null>;
  readonly companyLabel: string;
  readonly onContinue: () => void;
  readonly onSelectRecruiter: (recruiterId: Recruiter["id"]) => void;
  readonly recruiters: ReadonlyArray<Recruiter>;
  readonly selectedRecruiterId: Recruiter["id"] | null;
}): React.ReactElement {
  const [nameDraft, setNameDraft] = useState("");
  const [isAdding, setIsAdding] = useState(false);
  const selectedRecruiter =
    props.recruiters.find((recruiter) => recruiter.id === props.selectedRecruiterId) ?? null;

  const submitRecruiter = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const name = nameDraft.trim();

    if (name.length === 0) {
      return;
    }

    setIsAdding(true);

    try {
      const addedRecruiter = await props.addRecruiter(name);

      if (addedRecruiter != null) {
        setNameDraft("");
      }
    } finally {
      setIsAdding(false);
    }
  };

  return (
    <section className="grid gap-6 rounded-[var(--s2ee-panel-radius)] border border-primary bg-[var(--s2ee-surface)] p-5 shadow-[inset_4px_0_0_var(--color-primary)] sm:p-7 lg:grid-cols-[minmax(0,0.85fr)_minmax(320px,1fr)]">
      <div className="space-y-5">
        <div className="space-y-3">
          <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-primary">
            Onboarding recruteurs
          </p>
          <h2 className="max-w-2xl text-2xl font-black tracking-[-0.04em] text-slate-900 sm:text-3xl">
            Configurez le recruteur de cet appareil.
          </h2>
          <p className="max-w-2xl text-sm leading-7 text-[color:var(--s2ee-muted-foreground)]">
            {props.companyLabel} doit avoir au moins un recruteur avant de scanner un candidat. Vous
            pouvez en ajouter plusieurs, puis choisir celui utilise par defaut sur cet appareil.
          </p>
        </div>

        <form className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto]" onSubmit={submitRecruiter}>
          <Input
            className="h-12 rounded-[var(--s2ee-control-radius)] border-[var(--s2ee-border)] bg-[var(--s2ee-surface-soft)] shadow-none"
            disabled={isAdding}
            onChange={(event) => setNameDraft(event.currentTarget.value)}
            placeholder="Nom du recruteur"
            value={nameDraft}
          />
          <Button
            className="s2ee-command h-12 rounded-[var(--s2ee-control-radius)] px-6"
            loading={isAdding}
            type="submit"
          >
            Ajouter
          </Button>
        </form>
      </div>

      <div className="grid gap-4 rounded-[var(--s2ee-panel-radius)] border border-[var(--s2ee-border)] bg-[var(--s2ee-surface-soft)] p-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-[color:var(--s2ee-muted-foreground)]">
              Recruteur appareil
            </p>
            <p className="mt-2 text-sm font-bold uppercase tracking-[0.12em] text-slate-900">
              {selectedRecruiter?.name ?? "Aucun selectionne"}
            </p>
          </div>
          <Button
            className="s2ee-command rounded-[var(--s2ee-control-radius)]"
            disabled={selectedRecruiter == null}
            onClick={props.onContinue}
            type="button"
          >
            Continuer
          </Button>
        </div>

        <div className="grid gap-2">
          {props.recruiters.length === 0 ? (
            <div className="rounded-[var(--s2ee-control-radius)] border border-dashed border-[var(--s2ee-border)] bg-[var(--s2ee-surface)] p-4 text-sm leading-6 text-[color:var(--s2ee-muted-foreground)]">
              Aucun recruteur ajoute pour le moment.
            </div>
          ) : (
            props.recruiters.map((recruiter) => (
              <button
                className={[
                  "flex items-center justify-between gap-4 rounded-[var(--s2ee-control-radius)] border p-4 text-left transition-colors",
                  props.selectedRecruiterId === recruiter.id
                    ? "border-primary bg-[var(--s2ee-accent-wash)] text-primary"
                    : "border-[var(--s2ee-border)] bg-[var(--s2ee-surface)] text-slate-900 hover:border-primary/60",
                ].join(" ")}
                key={recruiter.id}
                onClick={() => props.onSelectRecruiter(recruiter.id)}
                type="button"
              >
                <span className="text-sm font-bold uppercase tracking-[0.12em]">
                  {recruiter.name}
                </span>
                <span className="text-[11px] font-bold uppercase tracking-[0.18em]">
                  {props.selectedRecruiterId === recruiter.id ? "Selectionne" : "Choisir"}
                </span>
              </button>
            ))
          )}
        </div>
      </div>
    </section>
  );
}

function RecruiterDropdown(props: {
  readonly addRecruiter: (name: string) => Promise<Recruiter | null>;
  readonly onSelectRecruiter: (recruiterId: Recruiter["id"]) => void;
  readonly recruiters: ReadonlyArray<Recruiter>;
  readonly selectedRecruiter: Recruiter | null;
  readonly selectedRecruiterId: Recruiter["id"] | null;
}): React.ReactElement {
  const [isOpen, setIsOpen] = useState(false);
  const [nameDraft, setNameDraft] = useState("");
  const [isAdding, setIsAdding] = useState(false);

  const submitRecruiter = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const name = nameDraft.trim();

    if (name.length === 0) {
      return;
    }

    setIsAdding(true);

    try {
      const recruiter = await props.addRecruiter(name);

      if (recruiter != null) {
        setNameDraft("");
        setIsOpen(false);
      }
    } finally {
      setIsAdding(false);
    }
  };

  return (
    <div className="mt-auto grid gap-2 border-t border-[var(--s2ee-border)] pt-5">
      <span className="s2ee-index-label">Recruteur</span>
      <Popover onOpenChange={setIsOpen} open={isOpen}>
        <PopoverTrigger>
          <Button
            className="s2ee-command h-12 w-full justify-between rounded-[var(--s2ee-control-radius)]"
            type="button"
            variant="outline"
          >
            <span className="truncate text-left">
              Recruteur: {props.selectedRecruiter?.name ?? "Aucun"}
            </span>
            <ChevronDownIcon />
          </Button>
        </PopoverTrigger>
        <PopoverPopup
          align="end"
          className="w-[min(22rem,calc(100vw-2rem))] rounded-[var(--s2ee-panel-radius)] p-0"
          sideOffset={8}
        >
          <div className="grid gap-4">
            <div className="grid gap-2">
              {props.recruiters.length === 0 ? (
                <p className="rounded-[var(--s2ee-control-radius)] border border-dashed border-[var(--s2ee-border)] bg-[var(--s2ee-surface-soft)] p-3 text-sm leading-6 text-[color:var(--s2ee-muted-foreground)]">
                  Aucun recruteur ajoute.
                </p>
              ) : (
                props.recruiters.map((recruiter) => (
                  <button
                    className={[
                      "flex items-center justify-between gap-3 rounded-[var(--s2ee-control-radius)] border px-3 py-3 text-left transition-colors",
                      props.selectedRecruiterId === recruiter.id
                        ? "border-primary bg-[var(--s2ee-accent-wash)] text-primary"
                        : "border-[var(--s2ee-border)] bg-[var(--s2ee-surface-soft)] hover:border-primary/60",
                    ].join(" ")}
                    key={recruiter.id}
                    onClick={() => {
                      props.onSelectRecruiter(recruiter.id);
                      setIsOpen(false);
                    }}
                    type="button"
                  >
                    <span className="truncate text-sm font-bold uppercase tracking-[0.12em]">
                      {recruiter.name}
                    </span>
                    <span className="text-[11px] font-bold uppercase tracking-[0.18em]">
                      {props.selectedRecruiterId === recruiter.id ? "Actif" : "Choisir"}
                    </span>
                  </button>
                ))
              )}
            </div>

            <form
              className="grid gap-3 border-t border-[var(--s2ee-border)] pt-4"
              onSubmit={submitRecruiter}
            >
              <label
                className="text-[11px] font-bold uppercase tracking-[0.22em] text-[color:var(--s2ee-muted-foreground)]"
                htmlFor="company-recruiter-dropdown-name"
              >
                Ajouter un recruteur
              </label>
              <Input
                id="company-recruiter-dropdown-name"
                className="rounded-[var(--s2ee-control-radius)] border-[var(--s2ee-border)] bg-[var(--s2ee-surface-soft)] shadow-none"
                disabled={isAdding}
                onChange={(event) => setNameDraft(event.currentTarget.value)}
                placeholder="Nom du recruteur"
                value={nameDraft}
              />
              <Button
                className="s2ee-command rounded-[var(--s2ee-control-radius)]"
                loading={isAdding}
                type="submit"
              >
                <UserPlusIcon />
                Ajouter
              </Button>
            </form>
          </div>
        </PopoverPopup>
      </Popover>
    </div>
  );
}

function CameraScanner(props: {
  readonly onDetected: (value: string) => void;
}): React.ReactElement {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const scannerRef = useRef<QrScanner | null>(null);
  const [cameraState, setCameraState] = useState<"idle" | "ready" | "error" | "unsupported">(
    "idle",
  );
  const [cameraMessage, setCameraMessage] = useState<string | null>(null);

  const stopCamera = useCallback(() => {
    scannerRef.current?.stop();
  }, []);

  const startCamera = useCallback(async () => {
    stopCamera();

    if (
      typeof window === "undefined" ||
      typeof navigator === "undefined" ||
      navigator.mediaDevices?.getUserMedia == null
    ) {
      setCameraState("unsupported");
      setCameraMessage("Le scan camera n'est pas disponible dans ce navigateur.");
      return;
    }

    try {
      const video = videoRef.current;

      if (video == null) {
        setCameraState("error");
        setCameraMessage("Impossible d'initialiser la camera.");
        return;
      }

      const scanner = new QrScanner(
        video,
        (result) => {
          stopCamera();
          props.onDetected(result.data);
        },
        {
          highlightCodeOutline: false,
          highlightScanRegion: false,
          onDecodeError: () => {
            // ignore transient decode misses while scanning
          },
          preferredCamera: "environment",
          returnDetailedScanResult: true,
        },
      );
      scannerRef.current = scanner;
      await scanner.start();

      setCameraState("ready");
      setCameraMessage(null);
    } catch {
      setCameraState("error");
      setCameraMessage("Acces camera refuse ou indisponible.");
    }
  }, [props, stopCamera]);

  useEffect(() => {
    void startCamera();

    return () => {
      stopCamera();
      scannerRef.current?.destroy();
      scannerRef.current = null;
    };
  }, [startCamera, stopCamera]);

  return (
    <div className="grid gap-3">
      <div className="relative overflow-hidden rounded-[var(--s2ee-panel-radius)] border border-[var(--s2ee-border)] bg-[var(--s2ee-surface)]">
        <video className="aspect-[4/3] w-full object-cover" muted playsInline ref={videoRef} />
        {cameraState !== "ready" ? (
          <div className="absolute inset-0 grid place-items-center bg-[var(--s2ee-surface)]/95 p-6 text-center">
            <div className="grid gap-3">
              <div className="mx-auto flex size-14 items-center justify-center rounded-[var(--s2ee-control-radius)] border border-[var(--s2ee-border)] bg-[var(--s2ee-surface-soft)]">
                <CameraIcon className="size-6 text-primary" />
              </div>
              <p className="max-w-sm text-sm leading-6 text-[color:var(--s2ee-muted-foreground)]">
                {cameraMessage ?? "Demarrage de la camera..."}
              </p>
            </div>
          </div>
        ) : (
          <div className="pointer-events-none absolute inset-x-6 inset-y-6 border border-primary/80" />
        )}
      </div>
      <Button
        className="s2ee-command rounded-[var(--s2ee-control-radius)]"
        onClick={() => void startCamera()}
        type="button"
        variant="outline"
      >
        <QrCodeIcon />
        Relancer la camera
      </Button>
    </div>
  );
}

function CandidatePreviewPanel(props: {
  readonly companyMissing: boolean;
  readonly isStartingInterview: boolean;
  readonly onStartInterview: (preview: PresentedCvProfilePreview) => Promise<void>;
  readonly presentationCode: string;
  readonly selectedRecruiter: Recruiter | null;
}): React.ReactElement {
  const previewAtom = useMemo(
    () => companyWorkspaceAtoms.resolvePresentedCvProfile(props.presentationCode),
    [props.presentationCode],
  );
  const previewResult = useAtomValue(previewAtom);
  const previewState = toAsyncPanelState(previewResult, "Ce code ne correspond a aucun CV.");

  if (previewState.kind === "loading") {
    return (
      <div className="grid gap-3">
        <Skeleton className="s2ee-skeleton h-14 rounded-[var(--s2ee-panel-radius)]" />
        <Skeleton className="s2ee-skeleton h-40 rounded-[var(--s2ee-panel-radius)]" />
        <Skeleton className="s2ee-skeleton h-14 rounded-[var(--s2ee-panel-radius)]" />
      </div>
    );
  }

  if (previewState.kind === "failure") {
    return (
      <Alert variant="error">
        <CircleAlertIcon className="size-4" />
        <AlertTitle>Candidat indisponible</AlertTitle>
        <AlertDescription>{previewState.message}</AlertDescription>
      </Alert>
    );
  }

  const candidatePreview = previewState.value;
  const canStartInterview =
    !props.companyMissing &&
    canConfirmInterviewStart({
      preview: candidatePreview,
      selectedRecruiterId: props.selectedRecruiter?.id ?? null,
    });

  return (
    <div className="grid gap-4">
      {props.companyMissing ? (
        <Alert variant="warning">
          <CircleAlertIcon className="size-4" />
          <AlertTitle>Configuration incomplete</AlertTitle>
          <AlertDescription>Ce compte doit d'abord etre relie a une entreprise.</AlertDescription>
        </Alert>
      ) : null}

      <div className="grid gap-4 rounded-[var(--s2ee-panel-radius)] border border-[var(--s2ee-border)] bg-[var(--s2ee-surface-soft)] p-5">
        <div className="space-y-2">
          <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-primary">Candidat</p>
          <h3 className="text-2xl font-black tracking-[-0.06em]">
            {candidatePreview.student.firstName} {candidatePreview.student.lastName}
          </h3>
          <p className="text-sm leading-6 text-[color:var(--s2ee-muted-foreground)]">
            {candidatePreview.student.institution} / {candidatePreview.student.academicYear} /{" "}
            {candidatePreview.student.major}
          </p>
        </div>
        <div className="grid gap-3 border-t border-[var(--s2ee-border)] pt-4 text-sm">
          <DetailRow label="Code" value={candidatePreview.cvProfile.presentationCode} />
          <DetailRow label="CV" value={candidatePreview.cvProfile.fileName} />
          <DetailRow
            label="Recruteur"
            value={props.selectedRecruiter?.name ?? "Selectionnez un recruteur"}
          />
        </div>
      </div>

      <Button
        className="s2ee-command h-14 rounded-[var(--s2ee-control-radius)] text-base font-black uppercase tracking-[0.18em]"
        disabled={!canStartInterview}
        loading={props.isStartingInterview}
        onClick={() => props.onStartInterview(candidatePreview)}
        type="button"
      >
        Demarrer l'entretien
        <ArrowRightIcon />
      </Button>
    </div>
  );
}

function DetailRow(props: { readonly label: string; readonly value: string }): React.ReactElement {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--s2ee-border)] pb-2 last:border-b-0 last:pb-0">
      <span className="text-[11px] font-bold uppercase tracking-[0.22em] text-[color:var(--s2ee-muted-foreground)]">
        {props.label}
      </span>
      <span className="text-right text-sm font-bold uppercase tracking-[0.14em]">
        {props.value}
      </span>
    </div>
  );
}

function EmptyPreview(props: { readonly message: string }): React.ReactElement {
  return (
    <div className="grid min-h-[320px] place-items-center rounded-[var(--s2ee-panel-radius)] border border-dashed border-[var(--s2ee-border)] bg-[var(--s2ee-surface-soft)] p-6 text-center">
      <p className="max-w-sm text-sm leading-6 text-[color:var(--s2ee-muted-foreground)]">
        {props.message}
      </p>
    </div>
  );
}
