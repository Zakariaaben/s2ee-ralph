"use client";

import { useAtomRefresh, useAtomSet, useAtomValue } from "@effect/atom-react";
import * as AsyncResult from "effect/unstable/reactivity/AsyncResult";
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
import { Skeleton } from "@project/ui/components/skeleton";
import type {
  CompanyCompletedInterviewLedgerEntry,
  Interview,
  Recruiter,
  UserRoleValue,
} from "@project/domain";
import {
  ArrowRightIcon,
  BriefcaseBusinessIcon,
  CircleAlertIcon,
  ClipboardListIcon,
  LogOutIcon,
  RefreshCwIcon,
  SparklesIcon,
  UsersRoundIcon,
} from "lucide-react";
import type React from "react";
import {
  startTransition,
  useEffect,
  useEffectEvent,
  useState,
} from "react";

import { authClient } from "@/lib/auth-client";
import {
  companyWorkspaceAtoms,
  companyWorkspaceReactivity,
} from "@/lib/company-atoms";
import { CompanyInterviewStartPanel } from "@/components/company/company-interview-start-panel";
import { CompanyInterviewExecutionPanel } from "@/components/company/company-interview-execution-panel";
import {
  describeInterviewNotes,
  type CompanyInterviewDraft,
} from "@/lib/company-interview-execution";
import {
  selectRecentCompletedInterviews,
  summarizeCompanyWorkspace,
} from "@/lib/company-workspace";
import { getRoleHomePath } from "@/lib/auth-routing";

const formatMutationError = (error: unknown): string => {
  if (error instanceof Error && error.message.trim().length > 0) {
    return error.message;
  }

  return "The workspace update did not complete. Refresh the surface and try again.";
};

const averageScoreLabel = (value: number | null): string =>
  value == null ? "No scored interviews yet" : `${value.toFixed(1)} / 5`;

const describeInterview = (interview: Interview): string => {
  const tags = interview.globalTags.length + interview.companyTags.length;
  const hasNotes = interview.notes.trim().length > 0;

  if (interview.status === "cancelled") {
    if (tags === 0 && !hasNotes) {
      return "Cancelled before scoring";
    }

    const details = [
      tags === 0 ? null : `${tags} tags captured`,
      hasNotes ? "notes captured" : null,
    ].filter((value) => value != null);

    return `Cancelled with ${details.join(" and ")}`;
  }

  if (interview.score == null) {
    if (tags === 0 && !hasNotes) {
      return "Awaiting scoring";
    }

    const details = [
      tags === 0 ? null : `${tags} tags captured`,
      hasNotes ? "notes captured" : null,
    ].filter((value) => value != null);

    return details.join(" and ");
  }

  if (tags === 0 && !hasNotes) {
    return `Scored ${interview.score} / 5`;
  }

  const details = [
    tags === 0 ? null : `${tags} tags`,
    hasNotes ? "notes captured" : null,
  ].filter((value) => value != null);

  return `${interview.score} / 5 with ${details.join(" and ")}`;
};

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
      message: "This panel could not load from the RPC contract.",
    };
  }

  return {
    kind: "success",
    value: result.value,
  };
};

export function CompanyWorkspace(): React.ReactElement {
  const session = authClient.useSession();
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [companyNameDraft, setCompanyNameDraft] = useState("");
  const [newRecruiterName, setNewRecruiterName] = useState("");
  const [editingRecruiterId, setEditingRecruiterId] = useState<Recruiter["id"] | null>(null);
  const [editingRecruiterName, setEditingRecruiterName] = useState("");
  const [workspaceMessage, setWorkspaceMessage] = useState<string | null>(null);
  const [workspaceError, setWorkspaceError] = useState<string | null>(null);
  const [stagedInterview, setStagedInterview] = useState<CompanyInterviewDraft | null>(null);

  const currentCompanyResult = useAtomValue(companyWorkspaceAtoms.currentCompany);
  const activeInterviewsResult = useAtomValue(companyWorkspaceAtoms.activeInterviews);
  const completedInterviewsResult = useAtomValue(companyWorkspaceAtoms.completedInterviews);

  const refreshCompany = useAtomRefresh(companyWorkspaceAtoms.currentCompany);
  const refreshActiveInterviews = useAtomRefresh(companyWorkspaceAtoms.activeInterviews);
  const refreshCompletedInterviews = useAtomRefresh(companyWorkspaceAtoms.completedInterviews);

  const saveCompanyProfile = useAtomSet(companyWorkspaceAtoms.upsertCompanyProfile, {
    mode: "promise",
  });
  const addRecruiter = useAtomSet(companyWorkspaceAtoms.addRecruiter, {
    mode: "promise",
  });
  const renameRecruiter = useAtomSet(companyWorkspaceAtoms.renameRecruiter, {
    mode: "promise",
  });

  const redirectTo = useEffectEvent((role: UserRoleValue | undefined | null) => {
    window.location.replace(role ? getRoleHomePath(role) : "/");
  });

  const currentRole = (session.data?.user as { role?: UserRoleValue } | undefined)?.role;

  useEffect(() => {
    if (session.isPending) {
      return;
    }

    if (!currentRole) {
      redirectTo(null);
      return;
    }

    if (currentRole !== "company") {
      redirectTo(currentRole);
    }
  }, [currentRole, redirectTo, session.isPending]);

  const handleSignOut = async () => {
    setIsSigningOut(true);

    try {
      await authClient.signOut();
      redirectTo(null);
    } finally {
      setIsSigningOut(false);
    }
  };

  const companyState = toAsyncPanelState(currentCompanyResult);
  const activeInterviewsState = toAsyncPanelState(activeInterviewsResult);
  const completedInterviewsState = toAsyncPanelState(completedInterviewsResult);

  const company = companyState.kind === "success" ? companyState.value : null;
  const activeInterviews =
    activeInterviewsState.kind === "success" ? activeInterviewsState.value : [];
  const completedInterviews =
    completedInterviewsState.kind === "success" ? completedInterviewsState.value : [];

  useEffect(() => {
    if (company != null) {
      setCompanyNameDraft(company.name);
      return;
    }

    setCompanyNameDraft("");
  }, [company]);

  const summary = summarizeCompanyWorkspace({
    company,
    activeInterviews,
    completedInterviews,
  });

  const recentCompleted = selectRecentCompletedInterviews(completedInterviews);

  const refreshWorkspace = () => {
    refreshCompany();
    refreshActiveInterviews();
    refreshCompletedInterviews();
  };

  const submitCompanyName = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const name = companyNameDraft.trim();

    if (name.length === 0) {
      setWorkspaceError("Company name cannot be blank.");
      return;
    }

    setWorkspaceError(null);
    setWorkspaceMessage(null);

    try {
      await saveCompanyProfile({
        payload: { name },
        reactivityKeys: companyWorkspaceReactivity.currentCompany,
      });
      startTransition(() => {
        setWorkspaceMessage(company == null ? "Company profile created." : "Company profile updated.");
      });
    } catch (error) {
      setWorkspaceError(formatMutationError(error));
    }
  };

  const submitNewRecruiter = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const name = newRecruiterName.trim();

    if (name.length === 0) {
      setWorkspaceError("Recruiter name cannot be blank.");
      return;
    }

    setWorkspaceError(null);
    setWorkspaceMessage(null);

    try {
      await addRecruiter({
        payload: { name },
        reactivityKeys: companyWorkspaceReactivity.currentCompany,
      });
      startTransition(() => {
        setNewRecruiterName("");
        setWorkspaceMessage(`Recruiter ${name} added.`);
      });
    } catch (error) {
      setWorkspaceError(formatMutationError(error));
    }
  };

  const startRecruiterEdit = (recruiter: Recruiter) => {
    startTransition(() => {
      setEditingRecruiterId(recruiter.id);
      setEditingRecruiterName(recruiter.name);
      setWorkspaceError(null);
      setWorkspaceMessage(null);
    });
  };

  const submitRecruiterRename = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (editingRecruiterId == null) {
      return;
    }

    const name = editingRecruiterName.trim();

    if (name.length === 0) {
      setWorkspaceError("Recruiter name cannot be blank.");
      return;
    }

    setWorkspaceError(null);
    setWorkspaceMessage(null);

    try {
      await renameRecruiter({
        payload: {
          recruiterId: editingRecruiterId,
          name,
        },
        reactivityKeys: companyWorkspaceReactivity.currentCompany,
      });
      startTransition(() => {
        setEditingRecruiterId(null);
        setEditingRecruiterName("");
        setWorkspaceMessage(`Recruiter renamed to ${name}.`);
      });
    } catch (error) {
      setWorkspaceError(formatMutationError(error));
    }
  };

  return (
    <main
      className="min-h-screen bg-background px-5 py-6 text-foreground sm:px-8 sm:py-8"
      style={{
        ["--font-heading" as string]: '"Fraunces", "Times New Roman", serif',
        ["--font-sans" as string]: '"Manrope", "Segoe UI", sans-serif',
      }}
    >
      <div className="mx-auto flex max-w-7xl flex-col gap-6">
        <section className="relative overflow-hidden rounded-[2rem] border border-border/70 bg-card/92 p-6 shadow-xs/5 sm:p-8">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(245,158,11,0.18),transparent_32%),radial-gradient(circle_at_bottom_right,rgba(249,115,22,0.12),transparent_28%),linear-gradient(135deg,rgba(255,255,255,0.08),transparent_60%)]"
          />

          <div className="relative flex flex-col gap-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div className="space-y-4">
                <Badge variant="warning" size="lg" className="rounded-full px-4">
                  Company workspace
                </Badge>
                <div className="space-y-3">
                  <div className="flex flex-wrap items-center gap-3">
                    <h1 className="font-heading text-4xl tracking-tight sm:text-5xl">
                      {company?.name ?? "Recruiter operations"}
                    </h1>
                    <Badge variant="outline" size="lg" className="rounded-full px-4">
                      /company
                    </Badge>
                  </div>
                  <p className="max-w-3xl text-muted-foreground text-sm sm:text-base">
                    This route now demonstrates the app’s shared Effect Atom pattern: RPC-backed
                    query atoms for workspace reads, RPC-backed mutation atoms for writes, and
                    reactivity-key invalidation instead of bespoke local cache plumbing.
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <Button variant="outline" onClick={refreshWorkspace}>
                  Refresh workspace
                  <RefreshCwIcon />
                </Button>
                <Button loading={isSigningOut} variant="outline" onClick={handleSignOut}>
                  Sign out
                  <LogOutIcon />
                </Button>
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              <WorkspaceMetricCard
                description="Recruiters attached to the signed-in company account."
                icon={UsersRoundIcon}
                label="Recruiter bench"
                value={summary.recruiterCount.toString()}
              />
              <WorkspaceMetricCard
                description="Interviews still active on the floor."
                icon={SparklesIcon}
                label="Active interviews"
                value={summary.activeInterviewCount.toString()}
              />
              <WorkspaceMetricCard
                description="Completed interview ledger entries available for export or review."
                icon={ClipboardListIcon}
                label="Completed ledger"
                value={summary.completedInterviewCount.toString()}
              />
              <WorkspaceMetricCard
                description={`${summary.distinctTagCount} distinct tags in play across the current ledger.`}
                icon={BriefcaseBusinessIcon}
                label="Average score"
                value={averageScoreLabel(summary.averageCompletedScore)}
              />
            </div>

            {(workspaceMessage != null || workspaceError != null) && (
              <div className="flex flex-wrap gap-3">
                {workspaceMessage != null && (
                  <Badge variant="success" size="lg" className="rounded-full px-4">
                    {workspaceMessage}
                  </Badge>
                )}
                {workspaceError != null && (
                  <Badge variant="error" size="lg" className="rounded-full px-4">
                    {workspaceError}
                  </Badge>
                )}
              </div>
            )}
          </div>
        </section>

        <CompanyInterviewStartPanel
          company={company}
          companyErrorMessage={companyState.kind === "failure" ? companyState.message : null}
          companyStatus={
            companyState.kind === "loading"
              ? "loading"
              : companyState.kind === "failure"
                ? "failure"
                : "ready"
          }
          onInterviewDraftChange={setStagedInterview}
          startedInterview={stagedInterview}
        />

        <CompanyInterviewExecutionPanel
          activeInterviews={activeInterviews}
          completedInterviews={completedInterviews}
          draft={stagedInterview}
          onClearDraft={() => setStagedInterview(null)}
        />

        <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
          <Card className="overflow-hidden border-border/70">
            <CardHeader className="gap-3 border-b border-border/60 bg-muted/36">
              <CardTitle>Company profile</CardTitle>
              <CardDescription>
                The profile form is backed by a mutation atom and invalidates only the current-company query.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6">
              {companyState.kind === "loading" && <ProfileSkeleton />}
              {companyState.kind === "failure" && (
                <WorkspacePanelFailure
                  message={companyState.message}
                  onRefresh={refreshCompany}
                />
              )}
              {companyState.kind === "success" && (
                <form className="grid gap-4" onSubmit={submitCompanyName}>
                  <div className="grid gap-2">
                    <label className="font-medium text-sm" htmlFor="company-name">
                      Company name
                    </label>
                    <Input
                      id="company-name"
                      value={companyNameDraft}
                      onChange={(event) => setCompanyNameDraft(event.currentTarget.value)}
                      placeholder="North Ridge Labs"
                    />
                  </div>

                  <div className="flex flex-wrap items-center gap-3">
                    <Button type="submit">
                      {company == null ? "Create profile" : "Save profile"}
                      <ArrowRightIcon />
                    </Button>
                    {company != null && (
                      <Badge variant="outline" size="lg" className="rounded-full px-4">
                        {company.recruiters.length} recruiters attached
                      </Badge>
                    )}
                  </div>
                </form>
              )}
            </CardContent>
          </Card>

          <Card className="overflow-hidden border-border/70">
            <CardHeader className="gap-3 border-b border-border/60 bg-muted/36">
              <CardTitle>Recruiter roster</CardTitle>
              <CardDescription>
                Recruiter add and rename flows use the same mutation-atom pattern the rest of the app can follow.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-5 p-6">
              {companyState.kind === "loading" && <RecruiterSkeleton />}
              {companyState.kind === "failure" && (
                <WorkspacePanelFailure
                  message={companyState.message}
                  onRefresh={refreshCompany}
                />
              )}
              {companyState.kind === "success" && (
                <>
                  {company == null ? (
                    <Empty className="rounded-[1.5rem] border border-dashed border-border/70 bg-background/72 py-10">
                      <EmptyHeader>
                        <EmptyMedia variant="icon">
                          <BriefcaseBusinessIcon />
                        </EmptyMedia>
                        <EmptyTitle>Create the company profile first</EmptyTitle>
                        <EmptyDescription>
                          The recruiter roster becomes writable as soon as the current company profile exists.
                        </EmptyDescription>
                      </EmptyHeader>
                    </Empty>
                  ) : (
                    <>
                      <form className="grid gap-3 sm:grid-cols-[1fr_auto]" onSubmit={submitNewRecruiter}>
                        <Input
                          value={newRecruiterName}
                          onChange={(event) => setNewRecruiterName(event.currentTarget.value)}
                          placeholder="Add a recruiter"
                        />
                        <Button type="submit">Add recruiter</Button>
                      </form>

                      {company.recruiters.length ? (
                    <div className="grid gap-3">
                      {company.recruiters.map((recruiter) => {
                        const isEditing = editingRecruiterId === recruiter.id;

                        return (
                          <Card
                            key={recruiter.id}
                            className="border-border/60 bg-background/72"
                          >
                            <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                              {isEditing ? (
                                <form
                                  className="flex flex-1 flex-col gap-3 sm:flex-row"
                                  onSubmit={submitRecruiterRename}
                                >
                                  <Input
                                    value={editingRecruiterName}
                                    onChange={(event) =>
                                      setEditingRecruiterName(event.currentTarget.value)
                                    }
                                    placeholder="Recruiter name"
                                  />
                                  <div className="flex gap-2">
                                    <Button size="sm" type="submit">
                                      Save
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => setEditingRecruiterId(null)}
                                    >
                                      Cancel
                                    </Button>
                                  </div>
                                </form>
                              ) : (
                                <>
                                  <div className="space-y-1">
                                    <p className="font-medium text-sm">{recruiter.name}</p>
                                    <p className="text-muted-foreground text-xs">
                                      Recruiter id: {recruiter.id}
                                    </p>
                                  </div>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => startRecruiterEdit(recruiter)}
                                  >
                                    Rename
                                  </Button>
                                </>
                              )}
                            </CardContent>
                          </Card>
                        );
                      })}
                    </div>
                      ) : (
                        <Empty className="rounded-[1.5rem] border border-dashed border-border/70 bg-background/72 py-10">
                          <EmptyHeader>
                            <EmptyMedia variant="icon">
                              <UsersRoundIcon />
                            </EmptyMedia>
                            <EmptyTitle>No recruiters yet</EmptyTitle>
                            <EmptyDescription>
                              This company account is live, but no recruiters have been added to the working roster.
                            </EmptyDescription>
                          </EmptyHeader>
                        </Empty>
                      )}
                    </>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
          <Card className="overflow-hidden border-border/70">
            <CardHeader className="gap-3 border-b border-border/60 bg-muted/36">
              <CardTitle>Active interview queue</CardTitle>
              <CardDescription>
                Read-only query atom showing current company interview activity.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3 p-6">
              {activeInterviewsState.kind === "loading" && <InterviewListSkeleton />}
              {activeInterviewsState.kind === "failure" && (
                <WorkspacePanelFailure
                  message={activeInterviewsState.message}
                  onRefresh={refreshActiveInterviews}
                />
              )}
              {activeInterviewsState.kind === "success" &&
                (activeInterviews.length > 0 ? (
                  activeInterviews.map((interview) => (
                    <InterviewCard key={interview.id} interview={interview} />
                  ))
                ) : (
                  <Empty className="rounded-[1.5rem] border border-dashed border-border/70 bg-background/72 py-10">
                    <EmptyHeader>
                      <EmptyMedia variant="icon">
                        <SparklesIcon />
                      </EmptyMedia>
                      <EmptyTitle>No active interviews</EmptyTitle>
                      <EmptyDescription>
                        The queue is clear. Persisted interview activity will appear here as soon as interview execution moves beyond start confirmation.
                      </EmptyDescription>
                    </EmptyHeader>
                  </Empty>
                ))}
            </CardContent>
          </Card>

          <Card className="overflow-hidden border-border/70">
            <CardHeader className="gap-3 border-b border-border/60 bg-muted/36">
              <CardTitle>Completed interview ledger</CardTitle>
              <CardDescription>
                Recent entries from the completed ledger query, reversed locally because the repository returns oldest-first history.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3 p-6">
              {completedInterviewsState.kind === "loading" && <CompletedListSkeleton />}
              {completedInterviewsState.kind === "failure" && (
                <WorkspacePanelFailure
                  message={completedInterviewsState.message}
                  onRefresh={refreshCompletedInterviews}
                />
              )}
              {completedInterviewsState.kind === "success" &&
                (recentCompleted.length > 0 ? (
                  recentCompleted.map((entry) => (
                    <CompletedInterviewCard key={entry.interview.id} entry={entry} />
                  ))
                ) : (
                  <Empty className="rounded-[1.5rem] border border-dashed border-border/70 bg-background/72 py-10">
                    <EmptyHeader>
                      <EmptyMedia variant="icon">
                        <ClipboardListIcon />
                      </EmptyMedia>
                      <EmptyTitle>No completed interviews yet</EmptyTitle>
                      <EmptyDescription>
                        Completed interviews will appear here as soon as the interview execution workflow starts persisting results.
                      </EmptyDescription>
                    </EmptyHeader>
                  </Empty>
                ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </main>
  );
}

function WorkspaceMetricCard(props: {
  readonly description: string;
  readonly icon: typeof BriefcaseBusinessIcon;
  readonly label: string;
  readonly value: string;
}): React.ReactElement {
  const Icon = props.icon;

  return (
    <Card className="border-border/70 bg-background/72">
      <CardContent className="grid gap-3 p-4">
        <div className="flex items-center justify-between gap-3">
          <Badge variant="outline" size="lg" className="rounded-full px-4">
            {props.label}
          </Badge>
          <div className="rounded-2xl border border-border/70 bg-card p-2.5">
            <Icon className="size-4" />
          </div>
        </div>
        <div className="space-y-1">
          <p className="font-heading text-3xl tracking-tight">{props.value}</p>
          <p className="text-muted-foreground text-xs leading-5">{props.description}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function InterviewCard({ interview }: { readonly interview: Interview }): React.ReactElement {
  const notes = describeInterviewNotes(interview.notes);

  return (
    <Card className="border-border/60 bg-background/72">
      <CardContent className="grid gap-3 p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="font-medium text-sm">{interview.recruiterName}</p>
            <p className="text-muted-foreground text-xs">Student {interview.studentId}</p>
          </div>
          <Badge variant="info" size="lg" className="rounded-full px-4">
            {interview.status}
          </Badge>
        </div>
        <p className="text-muted-foreground text-sm">{describeInterview(interview)}</p>
        {notes != null && <p className="text-sm leading-6">{notes}</p>}
      </CardContent>
    </Card>
  );
}

function CompletedInterviewCard({
  entry,
}: {
  readonly entry: CompanyCompletedInterviewLedgerEntry;
}): React.ReactElement {
  const score = entry.interview.score;
  const notes = describeInterviewNotes(entry.interview.notes);

  return (
    <Card className="border-border/60 bg-background/72">
      <CardContent className="grid gap-3 p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="font-medium text-sm">
              {entry.student.firstName} {entry.student.lastName}
            </p>
            <p className="text-muted-foreground text-xs">{entry.cvProfile.fileName}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge
              variant={score == null ? "outline" : "success"}
              size="lg"
              className="rounded-full px-4"
            >
              {score == null ? "No score" : `${score} / 5`}
            </Badge>
            <Badge variant="outline" size="lg" className="rounded-full px-4">
              {entry.interview.recruiterName}
            </Badge>
          </div>
        </div>
        <p className="text-muted-foreground text-sm">{describeInterview(entry.interview)}</p>
        {notes != null && <p className="text-sm leading-6">{notes}</p>}
      </CardContent>
    </Card>
  );
}

function WorkspacePanelFailure(props: {
  readonly message: string;
  readonly onRefresh: () => void;
}): React.ReactElement {
  return (
    <Empty className="rounded-[1.5rem] border border-dashed border-border/70 bg-background/72 py-10">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <CircleAlertIcon />
        </EmptyMedia>
        <EmptyTitle>Panel unavailable</EmptyTitle>
        <EmptyDescription>{props.message}</EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        <Button variant="outline" onClick={props.onRefresh}>
          Retry panel
          <RefreshCwIcon />
        </Button>
      </EmptyContent>
    </Empty>
  );
}

function ProfileSkeleton(): React.ReactElement {
  return (
    <div className="grid gap-4">
      <Skeleton className="h-4 w-24" />
      <Skeleton className="h-10 w-full rounded-lg" />
      <Skeleton className="h-9 w-32 rounded-lg" />
    </div>
  );
}

function RecruiterSkeleton(): React.ReactElement {
  return (
    <div className="grid gap-3">
      <Skeleton className="h-10 w-full rounded-lg" />
      <Skeleton className="h-20 w-full rounded-2xl" />
      <Skeleton className="h-20 w-full rounded-2xl" />
    </div>
  );
}

function InterviewListSkeleton(): React.ReactElement {
  return (
    <div className="grid gap-3">
      <Skeleton className="h-24 w-full rounded-2xl" />
      <Skeleton className="h-24 w-full rounded-2xl" />
    </div>
  );
}

function CompletedListSkeleton(): React.ReactElement {
  return (
    <div className="grid gap-3">
      <Skeleton className="h-28 w-full rounded-2xl" />
      <Skeleton className="h-28 w-full rounded-2xl" />
      <Skeleton className="h-28 w-full rounded-2xl" />
    </div>
  );
}
