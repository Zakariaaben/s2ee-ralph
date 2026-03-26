"use client";

import { useAtomSet, useAtomValue } from "@effect/atom-react";
import * as AsyncResult from "effect/unstable/reactivity/AsyncResult";
import { Alert, AlertDescription, AlertTitle } from "@project/ui/components/alert";
import { Button } from "@project/ui/components/button";
import { Skeleton } from "@project/ui/components/skeleton";
import type { CvProfile } from "@project/domain";
import { useNavigate } from "@tanstack/react-router";
import {
  ArrowLeftIcon,
  CircleAlertIcon,
  ExternalLinkIcon,
  LogOutIcon,
  Trash2Icon,
} from "lucide-react";
import QRCode from "qrcode";
import type React from "react";
import { useEffect, useMemo, useState } from "react";

import { authClient } from "@/lib/auth-client";
import { studentWorkspaceAtoms, studentWorkspaceReactivity } from "@/lib/student-atoms";
import { findStudentCvProfileById, formatFileSize } from "@/lib/student-workspace";

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

  return "L'action sur le CV n'a pas pu etre effectuee. Reessayez.";
};

export function StudentProfileDetail({ profileId }: { readonly profileId: string }): React.ReactElement {
  const navigate = useNavigate();
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [qrMarkup, setQrMarkup] = useState<string | null>(null);
  const [detailMessage, setDetailMessage] = useState<string | null>(null);
  const [detailError, setDetailError] = useState<string | null>(null);

  const cvProfilesResult = useAtomValue(studentWorkspaceAtoms.cvProfiles);
  const downloadUrlAtom = useMemo(
    () => studentWorkspaceAtoms.getStudentCvProfileDownloadUrl(profileId as CvProfile["id"]),
    [profileId],
  );
  const downloadUrlResult = useAtomValue(downloadUrlAtom);

  const deleteCvProfile = useAtomSet(studentWorkspaceAtoms.deleteStudentCvProfile, {
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

  const cvProfilesState = toAsyncPanelState(
    cvProfilesResult,
    "La liste des CV n'a pas pu etre chargee.",
  );
  const downloadUrlState = toAsyncPanelState(
    downloadUrlResult,
    "Le lien du PDF n'a pas pu etre charge.",
  );

  const cvProfiles = cvProfilesState.kind === "success" ? cvProfilesState.value : [];
  const selectedProfile = findStudentCvProfileById(cvProfiles, profileId);

  useEffect(() => {
    if (selectedProfile == null) {
      setQrMarkup(null);
      return;
    }

    let cancelled = false;

    void QRCode.toString(selectedProfile.presentationCode, {
      margin: 0,
      type: "svg",
      width: 256,
    })
      .then((markup) => {
        if (!cancelled) {
          setQrMarkup(markup);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setQrMarkup(null);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [selectedProfile]);

  const deleteSelectedProfile = async () => {
    if (selectedProfile == null) {
      return;
    }

    const confirmed = window.confirm(`Supprimer ${selectedProfile.fileName} ?`);
    if (!confirmed) {
      return;
    }

    setIsDeleting(true);
    setDetailError(null);
    setDetailMessage(null);

    try {
      await deleteCvProfile({
        payload: { cvProfileId: selectedProfile.id },
        reactivityKeys: studentWorkspaceReactivity.cvProfiles,
      });
      await navigate({ replace: true, to: "/student" });
    } catch (error) {
      setDetailError(formatMutationError(error));
    } finally {
      setIsDeleting(false);
    }
  };

  if (cvProfilesState.kind === "loading") {
    return (
      <main className="min-h-[100dvh] bg-[var(--s2ee-canvas)] font-mono text-foreground">
        <div className="mx-auto grid max-w-[1400px] gap-4 px-5 py-6 sm:px-8 sm:py-8">
          <Skeleton className="h-14 rounded-none" />
          <Skeleton className="h-[32rem] rounded-none" />
        </div>
      </main>
    );
  }

  if (cvProfilesState.kind === "failure") {
    return (
      <main className="min-h-[100dvh] bg-[var(--s2ee-canvas)] font-mono text-foreground">
        <div className="mx-auto grid max-w-[1100px] gap-4 px-5 py-6 sm:px-8 sm:py-8">
          <Button
            className="w-fit rounded-none border-[var(--s2ee-border)] bg-[var(--s2ee-surface)] px-4 uppercase tracking-[0.18em] text-[color:var(--s2ee-soft-foreground)] shadow-none hover:bg-white"
            variant="outline"
            onClick={() => navigate({ to: "/student" })}
          >
            <ArrowLeftIcon />
            Retour aux CV
          </Button>
          <Alert variant="error">
            <CircleAlertIcon className="size-4" />
            <AlertTitle>CV indisponible</AlertTitle>
            <AlertDescription>{cvProfilesState.message}</AlertDescription>
          </Alert>
        </div>
      </main>
    );
  }

  if (selectedProfile == null) {
    return (
      <main className="min-h-[100dvh] bg-[var(--s2ee-canvas)] font-mono text-foreground">
        <div className="mx-auto grid max-w-[1100px] gap-4 px-5 py-6 sm:px-8 sm:py-8">
          <Button
            className="w-fit rounded-none border-[var(--s2ee-border)] bg-[var(--s2ee-surface)] px-4 uppercase tracking-[0.18em] text-[color:var(--s2ee-soft-foreground)] shadow-none hover:bg-white"
            variant="outline"
            onClick={() => navigate({ to: "/student" })}
          >
            <ArrowLeftIcon />
            Retour aux CV
          </Button>
          <Alert variant="warning">
            <CircleAlertIcon className="size-4" />
            <AlertTitle>CV introuvable</AlertTitle>
            <AlertDescription>
              Ce CV n'est plus disponible dans votre espace.
            </AlertDescription>
          </Alert>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-[100dvh] bg-[var(--s2ee-canvas)] font-mono text-foreground">
      <header className="border-b bg-[var(--s2ee-surface-soft)] [border-color:var(--s2ee-border)]">
        <div className="mx-auto flex max-w-[1400px] flex-col gap-4 px-5 py-4 sm:px-8 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-3 text-[11px] font-bold uppercase tracking-[0.22em]">
              <span className="text-primary">S2EE</span>
              <span className="text-[color:var(--s2ee-muted-foreground)]">CV etudiant</span>
            </div>
            <div className="space-y-2">
              <h1 className="text-[clamp(2rem,5vw,3.25rem)] font-black tracking-[-0.08em] text-[color:var(--s2ee-soft-foreground)]">
                {selectedProfile.fileName}
              </h1>
              <p className="max-w-3xl text-sm leading-7 text-[color:var(--s2ee-soft-foreground)] sm:text-base">
                Utilisez ce QR code ou ce code manuel pour presenter ce CV.
              </p>
            </div>
          </div>

          <div className="grid gap-3 sm:flex sm:flex-wrap">
            <Button
              className="w-full rounded-none border-[var(--s2ee-border)] bg-[var(--s2ee-surface)] px-4 uppercase tracking-[0.18em] text-[color:var(--s2ee-soft-foreground)] shadow-none hover:bg-white sm:w-auto"
              variant="outline"
              onClick={() => navigate({ to: "/student" })}
            >
              <ArrowLeftIcon />
              Retour aux CV
            </Button>
            <Button
              className="w-full rounded-none border-[var(--s2ee-border)] bg-[var(--s2ee-surface)] px-4 uppercase tracking-[0.18em] text-[color:var(--s2ee-soft-foreground)] shadow-none hover:bg-white sm:w-auto"
              loading={isSigningOut}
              variant="outline"
              onClick={handleSignOut}
            >
              Se deconnecter
              <LogOutIcon />
            </Button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-[1400px] px-5 py-6 sm:px-8 sm:py-8">
        {(detailError || detailMessage) ? (
          <div className="mb-6 grid gap-3">
            {detailError ? (
              <Alert variant="error">
                <CircleAlertIcon className="size-4" />
                <AlertTitle>Echec de l'action</AlertTitle>
                <AlertDescription>{detailError}</AlertDescription>
              </Alert>
            ) : null}
            {detailMessage ? (
              <Alert>
                <AlertTitle>Mise a jour</AlertTitle>
                <AlertDescription>{detailMessage}</AlertDescription>
              </Alert>
            ) : null}
          </div>
        ) : null}

        <section className="grid gap-0 border [border-color:var(--s2ee-border)] lg:grid-cols-[minmax(0,1fr)_22rem]">
          <div className="border-b bg-[var(--s2ee-surface)] p-6 sm:p-8 lg:border-b-0 lg:border-r [border-color:var(--s2ee-border)]">
            <div className="grid gap-8 xl:grid-cols-[19rem_minmax(0,1fr)]">
              <div className="space-y-4">
                <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-[color:var(--s2ee-muted-foreground)]">
                  QR
                </p>
                <div className="border bg-white p-5 [border-color:var(--s2ee-border)]">
                  {qrMarkup ? (
                  <div
                    aria-label={`QR code for ${selectedProfile.presentationCode}`}
                    className="mx-auto max-w-[18rem] [&_svg]:h-auto [&_svg]:w-full"
                    dangerouslySetInnerHTML={{ __html: qrMarkup }}
                  />
                  ) : (
                    <Skeleton className="aspect-square w-full rounded-none" />
                  )}
                </div>
              </div>

              <div className="space-y-8">
                <div className="space-y-3">
                  <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-[color:var(--s2ee-muted-foreground)]">
                  Code manuel
                  </p>
                  <div className="border bg-[var(--s2ee-surface-soft)] px-4 py-5 text-center text-[clamp(1.4rem,7vw,2rem)] font-black tracking-[0.22em] text-[color:var(--s2ee-soft-foreground)] [border-color:var(--s2ee-border)]">
                    {selectedProfile.presentationCode}
                  </div>
                  <p className="text-sm leading-7 text-[color:var(--s2ee-soft-foreground)]">
                    Si le QR code ne peut pas etre scanne, utilisez ce code.
                  </p>
                </div>

                <div className="space-y-3">
                  <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-[color:var(--s2ee-muted-foreground)]">
                  Fichier
                  </p>
                  <div className="grid gap-3 border p-4 [border-color:var(--s2ee-border)]">
                    <div className="grid gap-1">
                      <p className="text-sm font-bold text-[color:var(--s2ee-soft-foreground)]">{selectedProfile.fileName}</p>
                      <p className="text-[11px] uppercase tracking-[0.16em] text-[color:var(--s2ee-muted-foreground)]">
                        {selectedProfile.contentType} · {formatFileSize(selectedProfile.fileSizeBytes)}
                      </p>
                    </div>

                    {downloadUrlState.kind === "loading" ? (
                      <Skeleton className="h-12 rounded-none" />
                    ) : downloadUrlState.kind === "failure" ? (
                      <Alert variant="warning">
                        <CircleAlertIcon className="size-4" />
                        <AlertTitle>PDF indisponible</AlertTitle>
                        <AlertDescription>{downloadUrlState.message}</AlertDescription>
                      </Alert>
                    ) : (
                      <a
                        className="flex min-h-12 w-full items-center justify-between border bg-primary px-4 py-3 text-sm font-bold uppercase tracking-[0.2em] text-primary-foreground transition-all duration-200 ease-[cubic-bezier(0.32,0.72,0,1)] hover:brightness-105"
                        href={downloadUrlState.value.url}
                        rel="noreferrer"
                        target="_blank"
                      >
                        <span>Ouvrir le PDF</span>
                        <ExternalLinkIcon className="size-4" />
                      </a>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <aside className="bg-[var(--s2ee-surface-soft)] p-6 sm:p-8">
            <div className="space-y-8">
              <div className="space-y-3">
                <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-[color:var(--s2ee-muted-foreground)]">
                  Notes
                </p>
                <div className="space-y-3 text-sm leading-7 text-[color:var(--s2ee-soft-foreground)]">
                  <p>Cette page correspond a un seul fichier.</p>
                  <p>Utilisez le QR code ou le code manuel pour cette version.</p>
                </div>
              </div>

              <div className="space-y-3">
                <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-[color:var(--s2ee-muted-foreground)]">
                  Action
                </p>
                <Button
                  className="w-full rounded-none px-4 uppercase tracking-[0.18em]"
                  loading={isDeleting}
                  variant="destructive-outline"
                  onClick={() => void deleteSelectedProfile()}
                >
                  Supprimer le CV
                  <Trash2Icon />
                </Button>
              </div>
            </div>
          </aside>
        </section>
      </div>
    </main>
  );
}
