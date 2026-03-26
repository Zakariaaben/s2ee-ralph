"use client";

import { useAtomSet, useAtomValue } from "@effect/atom-react";
import * as AsyncResult from "effect/unstable/reactivity/AsyncResult";
import { Alert, AlertDescription, AlertTitle } from "@project/ui/components/alert";
import { Button } from "@project/ui/components/button";
import { Checkbox } from "@project/ui/components/checkbox";
import { Input } from "@project/ui/components/input";
import { Popover, PopoverPopup, PopoverTrigger } from "@project/ui/components/popover";
import { Skeleton } from "@project/ui/components/skeleton";
import { Textarea } from "@project/ui/components/textarea";
import type {
  Interview,
} from "@project/domain";
import { Rating, ThinRoundedStar } from "@smastrom/react-rating";
import "@smastrom/react-rating/style.css";
import { useNavigate } from "@tanstack/react-router";
import {
  ArrowLeftIcon,
  ChevronDownIcon,
  CircleAlertIcon,
  LogOutIcon,
  OctagonXIcon,
} from "lucide-react";
import type React from "react";
import { useMemo, useState } from "react";

import { authClient } from "@/lib/auth-client";
import { companyWorkspaceAtoms, companyWorkspaceReactivity } from "@/lib/company-atoms";
import {
  buildAggregatedInterviewTagOptions,
  collectSuggestedCompanyTagLabels,
  filterAggregatedInterviewTagOptions,
  normalizeCustomTagLabel,
  partitionAggregatedInterviewTags,
  toggleAggregatedTagSelection,
} from "@/lib/company-interview-execution";

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

  return "L'action n'a pas pu etre terminee. Reessayez.";
};

export function CompanyInterviewDetail({
  interviewId,
}: {
  readonly interviewId: Interview["id"];
}): React.ReactElement {
  const navigate = useNavigate();
  const [score, setScore] = useState<number>(0);
  const [tagQuery, setTagQuery] = useState("");
  const [selectedTagLabels, setSelectedTagLabels] = useState<ReadonlyArray<string>>([]);
  const [notes, setNotes] = useState("");
  const [panelError, setPanelError] = useState<string | null>(null);
  const [isSubmittingAction, setIsSubmittingAction] = useState<"complete" | "cancel" | null>(null);
  const [isSigningOut, setIsSigningOut] = useState(false);

  const detailAtom = useMemo(
    () => companyWorkspaceAtoms.getCurrentCompanyInterviewDetail(interviewId),
    [interviewId],
  );
  const cvUrlAtom = useMemo(
    () => companyWorkspaceAtoms.getCurrentCompanyInterviewCvDownloadUrl(interviewId),
    [interviewId],
  );
  const detailResult = useAtomValue(detailAtom);
  const cvUrlResult = useAtomValue(cvUrlAtom);
  const completedInterviewsResult = useAtomValue(companyWorkspaceAtoms.completedInterviews);
  const globalInterviewTagsResult = useAtomValue(companyWorkspaceAtoms.globalInterviewTags);
  const completeInterview = useAtomSet(companyWorkspaceAtoms.completeInterview, {
    mode: "promise",
  });
  const cancelInterview = useAtomSet(companyWorkspaceAtoms.cancelInterview, {
    mode: "promise",
  });

  const detailState = toAsyncPanelState(detailResult, "Cet entretien n'a pas pu etre charge.");
  const cvUrlState = toAsyncPanelState(cvUrlResult, "Le PDF n'a pas pu etre charge.");
  const completedInterviewsState = toAsyncPanelState(
    completedInterviewsResult,
    "L'historique des entretiens n'a pas pu etre charge.",
  );
  const globalTagsState = toAsyncPanelState(
    globalInterviewTagsResult,
    "Les tags n'ont pas pu etre charges.",
  );

  const detail = detailState.kind === "success" ? detailState.value : null;
  const completedInterviews =
    completedInterviewsState.kind === "success" ? completedInterviewsState.value : [];
  const globalTags = globalTagsState.kind === "success" ? globalTagsState.value : [];
  const tagOptions = buildAggregatedInterviewTagOptions({
    globalTags,
    companyTagSuggestions:
      detail == null
        ? []
        : collectSuggestedCompanyTagLabels({
            activeInterviews: [detail.interview],
            completedInterviews,
          }),
  });
  const visibleTagOptions = filterAggregatedInterviewTagOptions(tagOptions, tagQuery);
  const customTagLabel = normalizeCustomTagLabel(tagQuery);
  const ratingStyles = {
    activeFillColor: "var(--color-primary)",
    activeStrokeColor: "#163c8c",
    inactiveFillColor: "transparent",
    inactiveStrokeColor: "#5f6d89",
    itemShapes: ThinRoundedStar,
    itemStrokeWidth: 1.75,
  } as const;

  const handleSignOut = async () => {
    setIsSigningOut(true);

    try {
      await authClient.signOut();
      await navigate({ replace: true, to: "/" });
    } finally {
      setIsSigningOut(false);
    }
  };

  const submitInterview = async (decision: "complete" | "cancel") => {
    if (detail == null) {
      return;
    }

    if (decision === "complete" && score < 1) {
      setPanelError("Choisissez une note avant de terminer l'entretien.");
      return;
    }

    setIsSubmittingAction(decision);
    setPanelError(null);

    try {
      if (decision === "complete") {
        const payloadTags = partitionAggregatedInterviewTags({
          options: tagOptions,
          selectedLabels: selectedTagLabels,
        });

        await completeInterview({
          payload: {
            interviewId: detail.interview.id,
            score,
            globalTagIds: payloadTags.globalTagIds,
            companyTagLabels: payloadTags.companyTagLabels,
            notes,
          },
          reactivityKeys: {
            activeInterviews: companyWorkspaceReactivity.activeInterviews,
            completedInterviews: companyWorkspaceReactivity.completedInterviews,
          },
        });
      } else {
        await cancelInterview({
          payload: {
            interviewId: detail.interview.id,
            notes,
          },
          reactivityKeys: {
            activeInterviews: companyWorkspaceReactivity.activeInterviews,
            completedInterviews: companyWorkspaceReactivity.completedInterviews,
          },
        });
      }

      await navigate({ to: "/company/interviews" });
    } catch (error) {
      setPanelError(formatMutationError(error));
    } finally {
      setIsSubmittingAction(null);
    }
  };

  if (detailState.kind === "loading") {
    return (
      <main className="min-h-[100dvh] bg-white font-mono text-[color:var(--s2ee-soft-foreground)]">
        <div className="mx-auto grid max-w-[1600px] gap-4 px-5 py-6 sm:px-8 sm:py-8">
          <Skeleton className="h-14 rounded-none" />
          <div className="grid gap-4 xl:grid-cols-[minmax(0,1.2fr)_minmax(360px,0.8fr)]">
            <Skeleton className="min-h-[60vh] rounded-none" />
            <Skeleton className="min-h-[60vh] rounded-none" />
          </div>
        </div>
      </main>
    );
  }

  if (detailState.kind === "failure" || detail == null) {
    return (
      <main className="min-h-[100dvh] bg-white font-mono text-[color:var(--s2ee-soft-foreground)]">
        <div className="mx-auto grid max-w-[1200px] gap-4 px-5 py-6 sm:px-8 sm:py-8">
          <div className="flex flex-wrap gap-2">
            <Button className="rounded-none" onClick={() => navigate({ to: "/company/interviews" })} variant="outline">
              <ArrowLeftIcon />
              Retour
            </Button>
            <Button className="rounded-none" loading={isSigningOut} onClick={handleSignOut} variant="outline">
              <LogOutIcon />
              Se deconnecter
            </Button>
          </div>
          <Alert variant="error">
            <CircleAlertIcon className="size-4" />
            <AlertTitle>Entretien indisponible</AlertTitle>
            <AlertDescription>{detailState.kind === "failure" ? detailState.message : "Cet entretien n'existe plus."}</AlertDescription>
          </Alert>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-[100dvh] bg-white font-mono text-[color:var(--s2ee-soft-foreground)]">
      <div className="mx-auto grid max-w-[1680px] gap-6 px-5 py-6 sm:px-8 sm:py-8">
        <header className="flex flex-col gap-4 border-b border-[var(--s2ee-border)] pb-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-3 text-[11px] font-bold uppercase tracking-[0.22em]">
              <span className="text-primary">S2EE Entreprise</span>
              <span className="text-[color:var(--s2ee-muted-foreground)]">Entretien</span>
              <span className="text-[color:var(--s2ee-muted-foreground)]">{detail.interview.id.slice(0, 8)}</span>
            </div>
            <div className="space-y-1">
              <h1 className="text-[clamp(2rem,4vw,3.2rem)] font-black tracking-[-0.08em]">
                {detail.student.firstName} {detail.student.lastName}
              </h1>
              <p className="max-w-3xl text-sm leading-6 text-[color:var(--s2ee-muted-foreground)]">
                {detail.student.institution} · {detail.student.academicYear} · {detail.student.major} · Recruteur{" "}
                {detail.interview.recruiterName}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button className="rounded-none" onClick={() => navigate({ to: "/company/interviews" })} variant="outline">
              <ArrowLeftIcon />
              Retour
            </Button>
            <Button className="rounded-none" onClick={() => navigate({ to: "/company" })} variant="outline">
              Scan
            </Button>
            <Button className="rounded-none" loading={isSigningOut} onClick={handleSignOut} variant="outline">
              <LogOutIcon />
              Se deconnecter
            </Button>
          </div>
        </header>

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(360px,0.8fr)]">
          <section className="overflow-hidden border border-[var(--s2ee-border)] bg-[var(--s2ee-surface-soft)]">
            {cvUrlState.kind === "loading" ? (
              <div className="grid min-h-[72vh] place-items-center">
                <Skeleton className="h-full min-h-[72vh] w-full rounded-none" />
              </div>
            ) : cvUrlState.kind === "failure" ? (
              <div className="p-4">
                <Alert variant="error">
                  <CircleAlertIcon className="size-4" />
                  <AlertTitle>PDF indisponible</AlertTitle>
                  <AlertDescription>{cvUrlState.message}</AlertDescription>
                </Alert>
              </div>
            ) : (
              <iframe
                className="min-h-[72vh] w-full bg-white"
                src={cvUrlState.value.url}
                title={`CV de ${detail.student.firstName} ${detail.student.lastName}`}
              />
            )}
          </section>

          <section className="grid gap-4">
            <div className="grid gap-4 border border-[var(--s2ee-border)] bg-white p-5">
              <div className="space-y-1">
                <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-primary">
                  Evaluation
                </p>
              </div>

              <div className="grid gap-3 border-t border-[var(--s2ee-border)] pt-4">
                <label className="text-[11px] font-bold uppercase tracking-[0.22em] text-[color:var(--s2ee-muted-foreground)]">
                  Note
                </label>
                <div className="grid gap-3 border border-[var(--s2ee-border)] bg-[var(--s2ee-surface-soft)] p-4">
                  <Rating
                    itemStyles={ratingStyles}
                    onChange={(value: number) => setScore(value)}
                    spaceBetween="small"
                    style={{ maxWidth: 220 }}
                    transition="colors"
                    value={score}
                  />
                  <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[color:var(--s2ee-muted-foreground)]">
                    {score === 0 ? "Aucune note" : `${score}/5`}
                  </p>
                </div>
              </div>

              <div className="grid gap-3 border-t border-[var(--s2ee-border)] pt-4">
                <label className="text-[11px] font-bold uppercase tracking-[0.22em] text-[color:var(--s2ee-muted-foreground)]">
                  Tags
                </label>
                <Popover>
                  <PopoverTrigger render={
                    <Button className="justify-between rounded-none" type="button" variant="outline" />
                  }>
                    <span className="truncate text-left">
                      {selectedTagLabels.length === 0
                        ? "Selectionner"
                        : `${selectedTagLabels.length} selectionnes`}
                    </span>
                    <ChevronDownIcon />
                  </PopoverTrigger>
                  <PopoverPopup align="start" className="w-[min(420px,calc(100vw-3rem))] rounded-none p-0" sideOffset={8}>
                    <div className="grid gap-3 p-4">
                      <Input
                        className="rounded-none border-[var(--s2ee-border)] bg-[var(--s2ee-surface-soft)] shadow-none"
                        onChange={(event) => {
                          const { value } = event.currentTarget;
                          setTagQuery(value);
                        }}
                        placeholder="Rechercher ou ajouter un tag"
                        value={tagQuery}
                      />
                      <div className="grid max-h-72 gap-2 overflow-y-auto">
                        {customTagLabel != null &&
                        !selectedTagLabels.some(
                          (selectedLabel) =>
                            selectedLabel.toLocaleLowerCase() === customTagLabel.toLocaleLowerCase(),
                        ) &&
                        !tagOptions.some(
                          (option) =>
                            option.label.toLocaleLowerCase() === customTagLabel.toLocaleLowerCase(),
                        ) ? (
                          <button
                            className="flex items-center justify-between border border-dashed border-[var(--s2ee-border)] px-3 py-2 text-left text-sm hover:bg-[var(--s2ee-surface-soft)]"
                            onClick={() => {
                              setSelectedTagLabels((current) =>
                                toggleAggregatedTagSelection(current, customTagLabel),
                              );
                              setTagQuery("");
                            }}
                            type="button"
                          >
                            <span>Ajouter {customTagLabel}</span>
                            <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-primary">
                              Personnalise
                            </span>
                          </button>
                        ) : null}

                        {visibleTagOptions.length === 0 ? (
                          <p className="text-sm leading-6 text-[color:var(--s2ee-muted-foreground)]">
                            Aucun tag ne correspond.
                          </p>
                        ) : (
                          visibleTagOptions.map((option) => {
                            const checked = selectedTagLabels.some(
                              (selectedLabel) =>
                                selectedLabel.toLocaleLowerCase() === option.label.toLocaleLowerCase(),
                            );

                            return (
                              <label
                                className="flex cursor-pointer items-center justify-between gap-3 border border-[var(--s2ee-border)] px-3 py-2 hover:bg-[var(--s2ee-surface-soft)]"
                                key={option.key}
                              >
                                <div className="grid gap-1">
                                  <span className="text-sm font-bold uppercase tracking-[0.14em]">
                                    {option.label}
                                  </span>
                                  <span className="text-[11px] uppercase tracking-[0.18em] text-[color:var(--s2ee-muted-foreground)]">
                                    {option.kind === "global" ? "Tag partage" : "Tag entreprise"}
                                  </span>
                                </div>
                                <Checkbox
                                  checked={checked}
                                  onCheckedChange={() =>
                                    setSelectedTagLabels((current) =>
                                      toggleAggregatedTagSelection(current, option.label),
                                    )
                                  }
                                />
                              </label>
                            );
                          })
                        )}
                      </div>
                    </div>
                  </PopoverPopup>
                </Popover>
                {selectedTagLabels.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {selectedTagLabels.map((label) => (
                      <button
                        className="border border-[var(--s2ee-border)] bg-[var(--s2ee-surface-soft)] px-3 py-2 text-[11px] font-bold uppercase tracking-[0.18em] hover:bg-white"
                        key={label}
                        onClick={() =>
                          setSelectedTagLabels((current) =>
                            toggleAggregatedTagSelection(current, label),
                          )
                        }
                        type="button"
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>

              <div className="grid gap-3 border-t border-[var(--s2ee-border)] pt-4">
                <label className="text-[11px] font-bold uppercase tracking-[0.22em] text-[color:var(--s2ee-muted-foreground)]">
                  Notes
                </label>
                <Textarea
                  className="min-h-40 rounded-none border-[var(--s2ee-border)] bg-[var(--s2ee-surface-soft)] shadow-none"
                  onChange={(event) => {
                    const { value } = event.currentTarget;
                    setNotes(value);
                  }}
                  placeholder="Notes"
                  value={notes}
                />
              </div>

              {panelError != null ? (
                <Alert variant="error">
                  <CircleAlertIcon className="size-4" />
                  <AlertTitle>Echec de mise a jour</AlertTitle>
                  <AlertDescription>{panelError}</AlertDescription>
                </Alert>
              ) : null}

              <div className="grid gap-2 pt-2 sm:grid-cols-2">
                <Button
                  className="h-12 rounded-none text-sm font-black uppercase tracking-[0.18em]"
                  loading={isSubmittingAction === "complete"}
                  onClick={() => submitInterview("complete")}
                  type="button"
                >
                  Terminer l'entretien
                </Button>
                <Button
                  className="h-12 rounded-none text-sm font-black uppercase tracking-[0.18em]"
                  loading={isSubmittingAction === "cancel"}
                  onClick={() => submitInterview("cancel")}
                  type="button"
                  variant="outline"
                >
                  Annuler l'entretien
                  <OctagonXIcon />
                </Button>
              </div>
            </div>

            <div className="grid gap-3 border border-[var(--s2ee-border)] bg-[var(--s2ee-surface-soft)] p-5 text-sm">
              <MetaRow label="Candidat" value={`${detail.student.firstName} ${detail.student.lastName}`} />
              <MetaRow label="Etablissement" value={detail.student.institution} />
              <MetaRow label="Parcours" value={`${detail.student.academicYear} · ${detail.student.major}`} />
              <MetaRow label="Recruteur" value={detail.interview.recruiterName} />
              <MetaRow label="Code" value={detail.cvProfile.presentationCode} />
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}

function MetaRow(props: {
  readonly label: string;
  readonly value: string;
}): React.ReactElement {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--s2ee-border)] pb-2 last:border-b-0 last:pb-0">
      <span className="text-[11px] font-bold uppercase tracking-[0.22em] text-[color:var(--s2ee-muted-foreground)]">
        {props.label}
      </span>
      <span className="text-right font-bold uppercase tracking-[0.14em]">{props.value}</span>
    </div>
  );
}
