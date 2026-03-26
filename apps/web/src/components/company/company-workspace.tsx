"use client";

import { useAtomRefresh, useAtomSet, useAtomValue } from "@effect/atom-react";
import * as AsyncResult from "effect/unstable/reactivity/AsyncResult";
import { Alert, AlertDescription, AlertTitle } from "@project/ui/components/alert";
import { Button } from "@project/ui/components/button";
import {
  Drawer,
  DrawerClose,
  DrawerDescription,
  DrawerHeader,
  DrawerPanel,
  DrawerPopup,
  DrawerTitle,
} from "@project/ui/components/drawer";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@project/ui/components/input-otp";
import { Input } from "@project/ui/components/input";
import { Skeleton } from "@project/ui/components/skeleton";
import type {
  PresentedCvProfilePreview,
  Recruiter,
} from "@project/domain";
import QrScanner from "qr-scanner";
import qrScannerWorkerUrl from "qr-scanner/qr-scanner-worker.min.js?url";
import { useNavigate } from "@tanstack/react-router";
import {
  ArrowRightIcon,
  CameraIcon,
  CircleAlertIcon,
  LogOutIcon,
  MenuIcon,
  QrCodeIcon,
  ScanLineIcon,
  Settings2Icon,
} from "lucide-react";
import type React from "react";
import {
  startTransition,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { authClient } from "@/lib/auth-client";
import { companyWorkspaceAtoms, companyWorkspaceReactivity } from "@/lib/company-atoms";
import {
  canConfirmInterviewStart,
  companyPreferredRecruiterStorageKey,
  normalizeStudentQrIdentityInput,
  resolveInterviewStartRecruiterId,
  resolvePreferredRecruiter,
} from "@/lib/company-interview-start";

type AsyncPanelState<Value> =
  | { readonly kind: "loading" }
  | { readonly kind: "failure"; readonly message: string }
  | { readonly kind: "success"; readonly value: Value };

type SessionLike = {
  readonly user?: {
    readonly name?: string | null;
  } | null;
};

const companySetupDrawerStorageKey = "company:setup-drawer-dismissed:v1";

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

export function CompanyWorkspace(): React.ReactElement {
  const navigate = useNavigate();
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [newRecruiterName, setNewRecruiterName] = useState("");
  const [editingRecruiterId, setEditingRecruiterId] = useState<Recruiter["id"] | null>(null);
  const [editingRecruiterName, setEditingRecruiterName] = useState("");
  const [submittedCode, setSubmittedCode] = useState<string | null>(null);
  const [codeDraft, setCodeDraft] = useState("");
  const [preferredRecruiterId, setPreferredRecruiterId] = useState<Recruiter["id"] | null>(null);
  const [selectedRecruiterId, setSelectedRecruiterId] = useState<Recruiter["id"] | null>(null);
  const [accountName, setAccountName] = useState<string>("Compte entreprise");
  const [pageMessage, setPageMessage] = useState<string | null>(null);
  const [pageError, setPageError] = useState<string | null>(null);
  const [isStartingInterview, setIsStartingInterview] = useState(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const currentCompanyResult = useAtomValue(companyWorkspaceAtoms.currentCompany);
  const refreshCompany = useAtomRefresh(companyWorkspaceAtoms.currentCompany);
  const addRecruiter = useAtomSet(companyWorkspaceAtoms.addRecruiter, {
    mode: "promise",
  });
  const renameRecruiter = useAtomSet(companyWorkspaceAtoms.renameRecruiter, {
    mode: "promise",
  });
  const startInterview = useAtomSet(companyWorkspaceAtoms.startInterview, {
    mode: "promise",
  });

  const companyState = toAsyncPanelState(
    currentCompanyResult,
    "Les informations de l'entreprise n'ont pas pu etre chargees.",
  );
  const company = companyState.kind === "success" ? companyState.value : null;
  const recruiters = company?.recruiters ?? [];
  const selectedRecruiter =
    recruiters.find((recruiter) => recruiter.id === selectedRecruiterId) ?? null;
  const companyLabel = company?.name ?? accountName;

  useEffect(() => {
    void authClient.getSession().then((session) => {
      const name =
        (session.data as SessionLike | null)?.user?.name?.trim() ?? "";

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
      (window.localStorage.getItem(companyPreferredRecruiterStorageKey) as Recruiter["id"] | null),
    );

    if (window.localStorage.getItem(companySetupDrawerStorageKey) !== "dismissed") {
      setIsDrawerOpen(true);
    }
  }, []);

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

  const handleDrawerOpenChange = (open: boolean) => {
    setIsDrawerOpen(open);

    if (!open && typeof window !== "undefined") {
      window.localStorage.setItem(companySetupDrawerStorageKey, "dismissed");
    }
  };

  const resetCandidate = () => {
    setSubmittedCode(null);
    setCodeDraft("");
    setPageError(null);
    setPageMessage(null);
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

  const submitRecruiter = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (company == null) {
      setPageError("Ce compte n'est pas encore lie a une entreprise.");
      return;
    }

    const name = newRecruiterName.trim();

    if (name.length === 0) {
      setPageError("Le nom du recruteur est obligatoire.");
      return;
    }

    setPageError(null);
    setPageMessage(null);

    try {
      await addRecruiter({
        payload: { name },
        reactivityKeys: companyWorkspaceReactivity.currentCompany,
      });
      setNewRecruiterName("");
      setPageMessage(`Recruteur ${name} ajoute.`);
      refreshCompany();
    } catch (error) {
      setPageError(formatMutationError(error));
    }
  };

  const submitRecruiterRename = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (company == null || editingRecruiterId == null) {
      return;
    }

    const name = editingRecruiterName.trim();

    if (name.length === 0) {
      setPageError("Le nom du recruteur est obligatoire.");
      return;
    }

    setPageError(null);
    setPageMessage(null);

    try {
      await renameRecruiter({
        payload: { recruiterId: editingRecruiterId, name },
        reactivityKeys: companyWorkspaceReactivity.currentCompany,
      });
      setEditingRecruiterId(null);
      setEditingRecruiterName("");
      setPageMessage("Recruteur mis a jour.");
      refreshCompany();
    } catch (error) {
      setPageError(formatMutationError(error));
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

  return (
    <main className="min-h-[100dvh] bg-white font-mono text-[color:var(--s2ee-soft-foreground)]">
      <Drawer onOpenChange={handleDrawerOpenChange} open={isDrawerOpen} position="right">
        <DrawerPopup className="rounded-none" position="right" showCloseButton>
          <DrawerHeader className="border-b border-[var(--s2ee-border)]">
            <div className="space-y-2">
              <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-primary">
                Entreprise
              </p>
              <DrawerTitle className="font-mono text-2xl font-black tracking-[-0.06em]">
                {companyLabel}
              </DrawerTitle>
              <DrawerDescription className="font-mono text-sm leading-6 text-[color:var(--s2ee-muted-foreground)]" />
            </div>
          </DrawerHeader>

          <DrawerPanel className="grid gap-6 overflow-y-auto">
            <div className="grid gap-2">
              <Button
                className="justify-start rounded-none"
                onClick={() => navigate({ to: "/company" })}
                type="button"
                variant="outline"
              >
                <ScanLineIcon />
                Scan
              </Button>
              <Button
                className="justify-start rounded-none"
                onClick={() => navigate({ to: "/company/interviews" })}
                type="button"
                variant="outline"
              >
                <ArrowRightIcon />
                Entretiens
              </Button>
            </div>

            {companyState.kind === "loading" ? (
              <div className="grid gap-3">
                <Skeleton className="h-20 rounded-none" />
                <Skeleton className="h-20 rounded-none" />
              </div>
            ) : company == null ? (
              <Alert variant="warning">
                <CircleAlertIcon className="size-4" />
                <AlertTitle>Entreprise manquante</AlertTitle>
                <AlertDescription>
                  Ce compte n&apos;est pas encore lie a une entreprise.
                </AlertDescription>
              </Alert>
            ) : (
              <div className="grid gap-6">
                <section className="grid gap-3">
                  <div className="space-y-1">
                    <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-primary">
                      Recruteurs
                    </p>
                  </div>
                  <div className="grid gap-2">
                    {recruiters.length === 0 ? (
                      <p className="text-sm leading-6 text-[color:var(--s2ee-muted-foreground)]">
                        Aucun recruteur.
                      </p>
                    ) : (
                      recruiters.map((recruiter) =>
                        editingRecruiterId === recruiter.id ? (
                          <form className="grid gap-2 border border-[var(--s2ee-border)] p-3" key={recruiter.id} onSubmit={submitRecruiterRename}>
                            <Input
                              className="rounded-none border-0 border-b border-[var(--s2ee-border)] bg-transparent px-0 py-2 text-sm shadow-none focus-visible:ring-0"
                              onChange={(event) => {
                                const { value } = event.currentTarget;
                                setEditingRecruiterName(value);
                              }}
                              value={editingRecruiterName}
                            />
                            <div className="flex gap-2">
                              <Button className="flex-1 rounded-none" type="submit">
                                Enregistrer
                              </Button>
                              <Button
                                className="flex-1 rounded-none"
                                onClick={() => {
                                  setEditingRecruiterId(null);
                                  setEditingRecruiterName("");
                                }}
                                type="button"
                                variant="outline"
                              >
                                Annuler
                              </Button>
                            </div>
                          </form>
                        ) : (
                          <div className="grid gap-3 border border-[var(--s2ee-border)] p-3" key={recruiter.id}>
                            <div className="flex items-start justify-between gap-3">
                              <div className="space-y-1">
                                <p className="text-sm font-bold uppercase tracking-[0.16em]">
                                  {recruiter.name}
                                </p>
                                <p className="text-[11px] uppercase tracking-[0.22em] text-[color:var(--s2ee-muted-foreground)]">
                                  {resolvePreferredRecruiter(recruiters, preferredRecruiterId)?.id === recruiter.id
                                    ? "Par defaut sur cet appareil"
                                    : "Disponible"}
                                </p>
                              </div>
                              <button
                                className="text-[11px] font-bold uppercase tracking-[0.18em] text-primary"
                                onClick={() => {
                                  setEditingRecruiterId(recruiter.id);
                                  setEditingRecruiterName(recruiter.name);
                                }}
                                type="button"
                              >
                                Renommer
                              </button>
                            </div>
                            <Button
                              className="rounded-none"
                              onClick={() => rememberRecruiter(recruiter.id)}
                              type="button"
                              variant={selectedRecruiterId === recruiter.id ? "default" : "outline"}
                            >
                              {selectedRecruiterId === recruiter.id ? "Selectionne" : "Selectionner"}
                            </Button>
                          </div>
                        ),
                      )
                    )}
                  </div>
                </section>

                <section className="grid gap-3 border-t border-[var(--s2ee-border)] pt-6">
                  <div className="space-y-1">
                    <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-primary">
                      Ajouter un recruteur
                    </p>
                  </div>
                  <form className="grid gap-3" onSubmit={submitRecruiter}>
                    <Input
                      className="rounded-none border-0 border-b border-[var(--s2ee-border)] bg-transparent px-0 py-2 text-sm shadow-none focus-visible:ring-0"
                      onChange={(event) => {
                        const { value } = event.currentTarget;
                        setNewRecruiterName(value);
                      }}
                      placeholder="Nom du recruteur"
                      value={newRecruiterName}
                    />
                    <Button className="rounded-none" type="submit">
                      Ajouter
                    </Button>
                  </form>
                </section>
              </div>
            )}

            <div className="grid gap-2 border-t border-[var(--s2ee-border)] pt-6">
              <DrawerClose render={<Button className="rounded-none justify-start" variant="outline" />}>
                <Settings2Icon />
                Fermer
              </DrawerClose>
              <Button
                className="justify-start rounded-none"
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

      <div className="mx-auto grid max-w-[1600px] gap-8 px-5 py-6 sm:px-8 sm:py-8">
        <header className="flex flex-col gap-4 border-b border-[var(--s2ee-border)] pb-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-3 text-[11px] font-bold uppercase tracking-[0.22em]">
              <span className="text-primary">S2EE Entreprise</span>
              <span className="text-[color:var(--s2ee-muted-foreground)]">{companyLabel}</span>
            </div>
            <div className="space-y-1">
              <h1 className="text-[clamp(2rem,4vw,3.4rem)] font-black tracking-[-0.08em]">
                Scan entretien
              </h1>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button className="rounded-none" onClick={() => setIsDrawerOpen(true)} type="button" variant="outline">
              <MenuIcon />
              Menu
            </Button>
            <Button className="rounded-none" onClick={() => navigate({ to: "/company/interviews" })} type="button" variant="outline">
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

        <div className="grid border border-[var(--s2ee-border)] lg:grid-cols-[minmax(0,1fr)_minmax(320px,0.85fr)]">
          <section className="grid gap-4 border-b border-[var(--s2ee-border)] bg-[var(--s2ee-surface-soft)] p-6 lg:border-r lg:border-b-0">
            <div className="space-y-2">
              <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-primary">
                Camera
              </p>
            </div>
            <CameraScanner
              onDetected={applyDetectedCode}
            />
            <form className="grid gap-3 border-t border-[var(--s2ee-border)] pt-4" onSubmit={submitCandidateCode}>
              <label className="text-[11px] font-bold uppercase tracking-[0.22em] text-[color:var(--s2ee-muted-foreground)]">
                Code manuel
              </label>
              <InputOTP
                containerClassName="justify-center"
                inputMode="text"
                maxLength={6}
                onChange={(value) => {
                  setCodeDraft(value.toUpperCase());
                }}
                pattern="[A-Za-z0-9]*"
                value={codeDraft}
              >
                <InputOTPGroup size="lg">
                  <InputOTPSlot className="rounded-none border-[var(--s2ee-border)] bg-white text-xl font-black uppercase tracking-[0.12em] shadow-none sm:size-10" index={0} />
                  <InputOTPSlot className="rounded-none border-[var(--s2ee-border)] bg-white text-xl font-black uppercase tracking-[0.12em] shadow-none sm:size-10" index={1} />
                  <InputOTPSlot className="rounded-none border-[var(--s2ee-border)] bg-white text-xl font-black uppercase tracking-[0.12em] shadow-none sm:size-10" index={2} />
                  <InputOTPSlot className="rounded-none border-[var(--s2ee-border)] bg-white text-xl font-black uppercase tracking-[0.12em] shadow-none sm:size-10" index={3} />
                  <InputOTPSlot className="rounded-none border-[var(--s2ee-border)] bg-white text-xl font-black uppercase tracking-[0.12em] shadow-none sm:size-10" index={4} />
                  <InputOTPSlot className="rounded-none border-[var(--s2ee-border)] bg-white text-xl font-black uppercase tracking-[0.12em] shadow-none sm:size-10" index={5} />
                </InputOTPGroup>
              </InputOTP>
              <div className="grid gap-2 sm:grid-cols-2">
                <Button className="rounded-none" type="submit">
                  Rechercher
                </Button>
                <Button className="rounded-none" onClick={resetCandidate} type="button" variant="outline">
                  Effacer
                </Button>
              </div>
            </form>
          </section>

          <section className="grid gap-4 p-6">
            <div className="space-y-2">
              <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-primary">
                Apercu candidat
              </p>
            </div>

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
          </section>
        </div>
      </div>
    </main>
  );
}

function CameraScanner(props: {
  readonly onDetected: (value: string) => void;
}): React.ReactElement {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const scannerRef = useRef<QrScanner | null>(null);
  const [cameraState, setCameraState] = useState<"idle" | "ready" | "error" | "unsupported">("idle");
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

      const scanner = new QrScanner(video, (result) => {
        stopCamera();
        props.onDetected(result.data);
      }, {
        highlightCodeOutline: false,
        highlightScanRegion: false,
        onDecodeError: () => {
          // ignore transient decode misses while scanning
        },
        preferredCamera: "environment",
        returnDetailedScanResult: true,
      });
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
      <div className="relative overflow-hidden border border-[var(--s2ee-border)] bg-white">
        <video
          className="aspect-[4/3] w-full object-cover"
          muted
          playsInline
          ref={videoRef}
        />
        {cameraState !== "ready" ? (
          <div className="absolute inset-0 grid place-items-center bg-[color:rgba(255,255,255,0.92)] p-6 text-center">
            <div className="grid gap-3">
              <div className="mx-auto flex size-14 items-center justify-center border border-[var(--s2ee-border)] bg-[var(--s2ee-surface-soft)]">
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
      <Button className="rounded-none" onClick={() => void startCamera()} type="button" variant="outline">
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
  const previewState = toAsyncPanelState(
    previewResult,
    "Ce code ne correspond a aucun CV.",
  );

  if (previewState.kind === "loading") {
    return (
      <div className="grid gap-3">
        <Skeleton className="h-14 rounded-none" />
        <Skeleton className="h-40 rounded-none" />
        <Skeleton className="h-14 rounded-none" />
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
          <AlertDescription>
            Ce compte doit d'abord etre relie a une entreprise.
          </AlertDescription>
        </Alert>
      ) : null}

      <div className="grid gap-4 border border-[var(--s2ee-border)] bg-[var(--s2ee-surface-soft)] p-5">
        <div className="space-y-2">
          <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-primary">Candidat</p>
          <h3 className="text-2xl font-black tracking-[-0.06em]">
            {candidatePreview.student.firstName} {candidatePreview.student.lastName}
          </h3>
          <p className="text-sm leading-6 text-[color:var(--s2ee-muted-foreground)]">
            {candidatePreview.student.institution} · {candidatePreview.student.academicYear} ·{" "}
            {candidatePreview.student.major}
          </p>
        </div>
        <div className="grid gap-3 border-t border-[var(--s2ee-border)] pt-4 text-sm">
          <DetailRow label="Code" value={candidatePreview.cvProfile.presentationCode} />
          <DetailRow label="CV" value={candidatePreview.cvProfile.fileName} />
          <DetailRow label="Recruteur" value={props.selectedRecruiter?.name ?? "Selectionnez un recruteur"} />
        </div>
      </div>

      <Button
        className="h-14 rounded-none text-base font-black uppercase tracking-[0.18em]"
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

function DetailRow(props: {
  readonly label: string;
  readonly value: string;
}): React.ReactElement {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--s2ee-border)] pb-2 last:border-b-0 last:pb-0">
      <span className="text-[11px] font-bold uppercase tracking-[0.22em] text-[color:var(--s2ee-muted-foreground)]">
        {props.label}
      </span>
      <span className="text-right text-sm font-bold uppercase tracking-[0.14em]">{props.value}</span>
    </div>
  );
}

function EmptyPreview(props: { readonly message: string }): React.ReactElement {
  return (
    <div className="grid min-h-[320px] place-items-center border border-dashed border-[var(--s2ee-border)] bg-[var(--s2ee-surface-soft)] p-6 text-center">
      <p className="max-w-sm text-sm leading-6 text-[color:var(--s2ee-muted-foreground)]">{props.message}</p>
    </div>
  );
}
