"use client";

import { useAtomSet, useAtomValue } from "@effect/atom-react";
import * as AsyncResult from "effect/unstable/reactivity/AsyncResult";
import { Badge } from "@project/ui/components/badge";
import { Button } from "@project/ui/components/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@project/ui/components/card";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@project/ui/components/empty";
import { Label } from "@project/ui/components/label";
import { Skeleton } from "@project/ui/components/skeleton";
import { Textarea } from "@project/ui/components/textarea";
import type {
  CompanyCompletedInterviewLedgerEntry,
  GlobalInterviewTag,
  Interview,
} from "@project/domain";
import {
  CheckCircle2Icon,
  CircleAlertIcon,
  DownloadIcon,
  NotebookPenIcon,
  OctagonXIcon,
  TagsIcon,
} from "lucide-react";
import type React from "react";
import { startTransition, useMemo, useState } from "react";

import { companyWorkspaceAtoms, companyWorkspaceReactivity } from "@/lib/company-atoms";
import {
  canCompleteInterviewDraft,
  collectSuggestedCompanyTagLabels,
  describeInterviewNotes,
  interviewScoreOptions,
  normalizeCompanyTagLabels,
  toggleGlobalInterviewTagId,
  type CompanyInterviewDraft,
} from "@/lib/company-interview-execution";

type AsyncPanelState<Value> =
  | { readonly kind: "loading" }
  | { readonly kind: "failure"; readonly message: string }
  | { readonly kind: "success"; readonly value: Value };

const toAsyncPanelState = <Value,>(
  result: AsyncResult.AsyncResult<Value, unknown>,
): AsyncPanelState<Value> => {
  if (AsyncResult.isInitial(result)) {
    return { kind: "loading" };
  }

  if (AsyncResult.isFailure(result)) {
    return {
      kind: "failure",
      message: "Interview execution settings could not load from the RPC contract.",
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

  return "The interview action did not complete. Refresh the company workspace and try again.";
};

const downloadBase64File = (input: {
  readonly contentType: string;
  readonly contentsBase64: string;
  readonly fileName: string;
}) => {
  const binary = window.atob(input.contentsBase64);
  const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
  const blob = new Blob([bytes], {
    type: input.contentType,
  });
  const objectUrl = URL.createObjectURL(blob);
  const anchor = document.createElement("a");

  anchor.href = objectUrl;
  anchor.download = input.fileName;
  anchor.click();
  URL.revokeObjectURL(objectUrl);
};

export function CompanyInterviewExecutionPanel(props: {
  readonly activeInterviews: ReadonlyArray<Interview>;
  readonly completedInterviews: ReadonlyArray<CompanyCompletedInterviewLedgerEntry>;
  readonly draft: CompanyInterviewDraft | null;
  readonly onClearDraft: () => void;
}): React.ReactElement {
  const [selectedScore, setSelectedScore] = useState<number | null>(null);
  const [selectedGlobalTagIds, setSelectedGlobalTagIds] = useState<
    ReadonlyArray<GlobalInterviewTag["id"]>
  >([]);
  const [companyTagInput, setCompanyTagInput] = useState("");
  const [notes, setNotes] = useState("");
  const [isSubmittingAction, setIsSubmittingAction] = useState<"complete" | "cancel" | null>(null);
  const [isExporting, setIsExporting] = useState<false | "json" | "bundle">(false);
  const [panelMessage, setPanelMessage] = useState<string | null>(null);
  const [panelError, setPanelError] = useState<string | null>(null);

  const globalInterviewTagsResult = useAtomValue(companyWorkspaceAtoms.globalInterviewTags);
  const completeInterview = useAtomSet(companyWorkspaceAtoms.completeInterview, {
    mode: "promise",
  });
  const cancelInterview = useAtomSet(companyWorkspaceAtoms.cancelInterview, {
    mode: "promise",
  });
  const exportCompletedInterviews = useAtomSet(companyWorkspaceAtoms.exportCompletedInterviews, {
    mode: "promise",
  });

  const globalInterviewTagsState = toAsyncPanelState(globalInterviewTagsResult);
  const suggestedCompanyTags = useMemo(
    () =>
      collectSuggestedCompanyTagLabels({
        activeInterviews: props.activeInterviews,
        completedInterviews: props.completedInterviews,
      }),
    [props.activeInterviews, props.completedInterviews],
  );
  const normalizedCompanyTagLabels = normalizeCompanyTagLabels(companyTagInput);
  const notesPreview = describeInterviewNotes(notes);

  const clearExecutionDraft = () => {
    startTransition(() => {
      setSelectedScore(null);
      setSelectedGlobalTagIds([]);
      setCompanyTagInput("");
      setNotes("");
      setPanelError(null);
    });
    props.onClearDraft();
  };

  const submitInterview = async (decision: "complete" | "cancel") => {
    if (props.draft == null) {
      setPanelError("Confirm an interview start before persisting an interview decision.");
      return;
    }

    if (decision === "complete" && selectedScore == null) {
      setPanelError("Choose an interview score before completing the interview.");
      return;
    }

    setIsSubmittingAction(decision);
    setPanelError(null);
    setPanelMessage(null);

    try {
      const payload = {
        recruiterId: props.draft.recruiter.id,
        qrIdentity: props.draft.qrIdentity,
        cvProfileId: props.draft.cvProfile.id,
        notes,
      };

      if (decision === "complete") {
        const savedInterview = await completeInterview({
          payload: {
            ...payload,
            score: selectedScore!,
            globalTagIds: selectedGlobalTagIds,
            companyTagLabels: normalizedCompanyTagLabels,
          },
          reactivityKeys: {
            activeInterviews: companyWorkspaceReactivity.activeInterviews,
            completedInterviews: companyWorkspaceReactivity.completedInterviews,
          },
        });

        startTransition(() => {
          setPanelMessage(
            `Interview completed for ${props.draft!.student.firstName} ${props.draft!.student.lastName} at ${savedInterview.score} / 5.`,
          );
        });
      } else {
        await cancelInterview({
          payload,
          reactivityKeys: {
            activeInterviews: companyWorkspaceReactivity.activeInterviews,
            completedInterviews: companyWorkspaceReactivity.completedInterviews,
          },
        });

        startTransition(() => {
          setPanelMessage(
            `Interview cancelled for ${props.draft!.student.firstName} ${props.draft!.student.lastName}.`,
          );
        });
      }

      startTransition(() => {
        setSelectedScore(null);
        setSelectedGlobalTagIds([]);
        setCompanyTagInput("");
        setNotes("");
      });
      props.onClearDraft();
    } catch (error) {
      setPanelError(formatMutationError(error));
    } finally {
      setIsSubmittingAction(null);
    }
  };

  const exportLedger = async (includeCvFiles: boolean) => {
    setIsExporting(includeCvFiles ? "bundle" : "json");
    setPanelError(null);
    setPanelMessage(null);

    try {
      const exportedFile = await exportCompletedInterviews({
        payload: {
          includeCvFiles,
        },
      });

      downloadBase64File(exportedFile);
      startTransition(() => {
        setPanelMessage(
          includeCvFiles
            ? "Completed interviews exported with CV files embedded."
            : "Completed interviews exported as JSON.",
        );
      });
    } catch (error) {
      setPanelError(formatMutationError(error));
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Card className="overflow-hidden border-border/70">
      <CardHeader className="gap-3 border-b border-border/60 bg-muted/36">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="info" size="lg" className="rounded-full px-4">
                Interview execution
              </Badge>
              <Badge variant="outline" size="lg" className="rounded-full px-4">
                Score, tags, notes
              </Badge>
            </div>
            <CardTitle>Complete or cancel the staged interview</CardTitle>
            <CardDescription>
              Persist the recruiter-confirmed interview with structured score, shared tags, company tags, and notes. Export remains available from this same workspace.
            </CardDescription>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              loading={isExporting === "json"}
              onClick={() => exportLedger(false)}
              variant="outline"
            >
              Export JSON
              <DownloadIcon />
            </Button>
            <Button
              loading={isExporting === "bundle"}
              onClick={() => exportLedger(true)}
              variant="outline"
            >
              Export with CVs
              <DownloadIcon />
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="grid gap-6 p-6 lg:grid-cols-[minmax(0,0.72fr)_minmax(0,1.28fr)]">
        <div className="grid gap-4">
          <Card className="border-border/60 bg-background/72">
            <CardContent className="grid gap-3 p-4">
              <div className="flex items-center justify-between gap-3">
                <p className="font-medium text-sm">Staged interview</p>
                <Badge
                  variant={props.draft == null ? "outline" : "success"}
                  size="lg"
                  className="rounded-full px-4"
                >
                  {props.draft == null ? "Awaiting confirmation" : "Ready to persist"}
                </Badge>
              </div>

              {props.draft == null ? (
                <Empty className="rounded-[1.5rem] border border-dashed border-border/70 bg-card/72 py-8">
                  <EmptyHeader>
                    <EmptyMedia variant="icon">
                      <NotebookPenIcon />
                    </EmptyMedia>
                    <EmptyTitle>No interview staged</EmptyTitle>
                    <EmptyDescription>
                      Use the launchpad above to resolve a student, choose recruiter and CV, then confirm the interview start.
                    </EmptyDescription>
                  </EmptyHeader>
                </Empty>
              ) : (
                <div className="grid gap-3">
                  <SummaryRow label="Student" value={`${props.draft.student.firstName} ${props.draft.student.lastName}`} />
                  <SummaryRow label="Course" value={props.draft.student.course} />
                  <SummaryRow label="Recruiter" value={props.draft.recruiter.name} />
                  <SummaryRow label="CV" value={props.draft.cvProfile.fileName} />
                  <SummaryRow label="QR" value={props.draft.qrIdentity} />
                  <Button onClick={clearExecutionDraft} variant="outline">
                    Clear staged interview
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {(panelMessage != null || panelError != null) && (
            <div className="flex flex-wrap gap-3">
              {panelMessage != null && (
                <Badge variant="success" size="lg" className="rounded-full px-4">
                  {panelMessage}
                </Badge>
              )}
              {panelError != null && (
                <Badge variant="error" size="lg" className="rounded-full px-4">
                  {panelError}
                </Badge>
              )}
            </div>
          )}
        </div>

        <div className="grid gap-4">
          {globalInterviewTagsState.kind === "loading" ? (
            <ExecutionSkeleton />
          ) : globalInterviewTagsState.kind === "failure" ? (
            <Empty className="rounded-[1.5rem] border border-dashed border-border/70 bg-background/72 py-10">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <CircleAlertIcon />
                </EmptyMedia>
                <EmptyTitle>Execution settings unavailable</EmptyTitle>
                <EmptyDescription>{globalInterviewTagsState.message}</EmptyDescription>
              </EmptyHeader>
            </Empty>
          ) : (
            <>
              <Card className="border-border/60 bg-background/72">
                <CardContent className="grid gap-5 p-5">
                  <section className="grid gap-3">
                    <div className="space-y-1">
                      <Label>Interview score</Label>
                      <p className="text-muted-foreground text-sm">
                        Score is required for completion and intentionally not captured for cancellations.
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {interviewScoreOptions.map((score) => (
                        <button
                          className={`rounded-full border px-4 py-2 text-sm transition-colors ${
                            selectedScore === score
                              ? "border-emerald-500/70 bg-emerald-500/12 text-foreground"
                              : "border-border/70 bg-card/72 hover:border-emerald-500/40 hover:bg-emerald-500/6"
                          }`}
                          key={score}
                          onClick={() => setSelectedScore(score)}
                          type="button"
                        >
                          {score} / 5
                        </button>
                      ))}
                    </div>
                  </section>

                  <section className="grid gap-3">
                    <div className="space-y-1">
                      <Label>Global interview tags</Label>
                      <p className="text-muted-foreground text-sm">
                        Shared tags come from organizer-controlled vocabulary.
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {globalInterviewTagsState.value.length > 0 ? (
                        globalInterviewTagsState.value.map((tag) => {
                          const selected = selectedGlobalTagIds.includes(tag.id);

                          return (
                            <button
                              className={`rounded-full border px-4 py-2 text-sm transition-colors ${
                                selected
                                  ? "border-sky-500/70 bg-sky-500/12 text-foreground"
                                  : "border-border/70 bg-card/72 hover:border-sky-500/40 hover:bg-sky-500/6"
                              }`}
                              key={tag.id}
                              onClick={() =>
                                setSelectedGlobalTagIds((current) =>
                                  toggleGlobalInterviewTagId(current, tag.id),
                                )}
                              type="button"
                            >
                              {tag.label}
                            </button>
                          );
                        })
                      ) : (
                        <p className="text-muted-foreground text-sm">
                          No global tags are configured yet.
                        </p>
                      )}
                    </div>
                  </section>

                  <section className="grid gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <TagsIcon className="size-4 text-muted-foreground" />
                        <Label htmlFor="company-tag-input">Company-specific tags</Label>
                      </div>
                      <p className="text-muted-foreground text-sm">
                        Enter one tag per line or separate tags with commas. Reused tags stay company-scoped.
                      </p>
                    </div>
                    <Textarea
                      id="company-tag-input"
                      onChange={(event) => setCompanyTagInput(event.currentTarget.value)}
                      placeholder={"Backend Ready\nFollow Up"}
                      value={companyTagInput}
                    />
                    {suggestedCompanyTags.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {suggestedCompanyTags.map((label) => (
                          <button
                            className="rounded-full border border-border/70 bg-card/72 px-4 py-2 text-sm transition-colors hover:border-amber-500/40 hover:bg-amber-500/6"
                            key={label}
                            onClick={() => {
                              const existing = normalizeCompanyTagLabels(companyTagInput);

                              if (existing.some((entry) => entry.toLocaleLowerCase() === label.toLocaleLowerCase())) {
                                return;
                              }

                              setCompanyTagInput((current) =>
                                current.trim().length === 0 ? label : `${current.trim()}\n${label}`,
                              );
                            }}
                            type="button"
                          >
                            {label}
                          </button>
                        ))}
                      </div>
                    )}
                    {normalizedCompanyTagLabels.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {normalizedCompanyTagLabels.map((label) => (
                          <Badge key={label} size="lg" variant="warning" className="rounded-full px-4">
                            {label}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </section>

                  <section className="grid gap-3">
                    <div className="space-y-1">
                      <Label htmlFor="interview-notes">Interview notes</Label>
                      <p className="text-muted-foreground text-sm">
                        Notes persist for both completed and cancelled interviews and stay visible in review/export.
                      </p>
                    </div>
                    <Textarea
                      id="interview-notes"
                      onChange={(event) => setNotes(event.currentTarget.value)}
                      placeholder="Summarize the conversation, concerns, follow-up owners, or why the interview was cancelled."
                      value={notes}
                    />
                    <p className="text-muted-foreground text-sm">
                      {notesPreview == null ? "No notes captured yet." : notesPreview}
                    </p>
                  </section>
                </CardContent>
              </Card>

              <div className="flex flex-wrap items-center gap-3">
                <Button
                  disabled={!canCompleteInterviewDraft({ draft: props.draft, score: selectedScore })}
                  loading={isSubmittingAction === "complete"}
                  onClick={() => submitInterview("complete")}
                >
                  Complete interview
                  <CheckCircle2Icon />
                </Button>
                <Button
                  disabled={props.draft == null}
                  loading={isSubmittingAction === "cancel"}
                  onClick={() => submitInterview("cancel")}
                  variant="outline"
                >
                  Cancel interview
                  <OctagonXIcon />
                </Button>
                <Badge variant="outline" size="lg" className="rounded-full px-4">
                  {normalizedCompanyTagLabels.length} company tags
                </Badge>
                <Badge variant="outline" size="lg" className="rounded-full px-4">
                  {selectedGlobalTagIds.length} global tags
                </Badge>
              </div>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function SummaryRow(props: {
  readonly label: string;
  readonly value: string;
}): React.ReactElement {
  return (
    <div className="grid gap-1 rounded-2xl border border-border/70 bg-card/72 p-3">
      <span className="text-muted-foreground text-xs uppercase tracking-[0.18em]">
        {props.label}
      </span>
      <span className="font-medium text-sm">{props.value}</span>
    </div>
  );
}

function ExecutionSkeleton(): React.ReactElement {
  return (
    <div className="grid gap-3">
      <Skeleton className="h-18 w-full rounded-2xl" />
      <Skeleton className="h-24 w-full rounded-2xl" />
      <Skeleton className="h-28 w-full rounded-2xl" />
      <Skeleton className="h-36 w-full rounded-2xl" />
    </div>
  );
}
