"use client";

import { useAtomValue } from "@effect/atom-react";
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
import { Label } from "@project/ui/components/label";
import { Skeleton } from "@project/ui/components/skeleton";
import type { Company, CvProfile, Recruiter, Student } from "@project/domain";
import {
  ArrowRightIcon,
  CircleAlertIcon,
  RefreshCwIcon,
  ScanLineIcon,
  Undo2Icon,
  UserRoundIcon,
} from "lucide-react";
import type React from "react";
import {
  startTransition,
  useEffect,
  useMemo,
  useState,
} from "react";

import { companyWorkspaceAtoms } from "@/lib/company-atoms";
import {
  canConfirmInterviewStart,
  companyPreferredRecruiterStorageKey,
  normalizeStudentQrIdentityInput,
  resolveInterviewStartCvProfileId,
  resolveInterviewStartRecruiterId,
  resolvePreferredRecruiter,
  summarizeInterviewStartChecklist,
  type CompanyInterviewDraft,
} from "@/lib/company-interview-start";

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

export function CompanyInterviewStartPanel({
  company,
  companyErrorMessage,
  companyStatus,
  onInterviewDraftChange,
  startedInterview,
}: {
  readonly company: Company | null;
  readonly companyErrorMessage: string | null;
  readonly companyStatus: "loading" | "failure" | "ready";
  readonly onInterviewDraftChange: (draft: CompanyInterviewDraft | null) => void;
  readonly startedInterview: CompanyInterviewDraft | null;
}): React.ReactElement {
  const [qrIdentityDraft, setQrIdentityDraft] = useState("");
  const [submittedQrIdentity, setSubmittedQrIdentity] = useState<string | null>(null);
  const [preferredRecruiterId, setPreferredRecruiterId] = useState<Recruiter["id"] | null>(null);
  const [selectedRecruiterId, setSelectedRecruiterId] = useState<Recruiter["id"] | null>(null);
  const [selectedCvProfileId, setSelectedCvProfileId] = useState<CvProfile["id"] | null>(null);
  const [panelError, setPanelError] = useState<string | null>(null);

  const recruiters = company?.recruiters ?? [];
  const rememberedRecruiter = resolvePreferredRecruiter(recruiters, preferredRecruiterId);

  useEffect(() => {
    const storedRecruiterId =
      typeof window === "undefined"
        ? null
        : (window.localStorage.getItem(
            companyPreferredRecruiterStorageKey,
          ) as Recruiter["id"] | null);

    setPreferredRecruiterId(storedRecruiterId);
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
      setPanelError(null);
    });
    onInterviewDraftChange(null);

    if (typeof window !== "undefined") {
      window.localStorage.setItem(companyPreferredRecruiterStorageKey, recruiterId);
    }
  };

  const resetInterviewStart = () => {
    startTransition(() => {
      setQrIdentityDraft("");
      setSubmittedQrIdentity(null);
      setSelectedCvProfileId(null);
      setPanelError(null);
    });
    onInterviewDraftChange(null);
  };

  const submitQrIdentity = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const normalizedQrIdentity = normalizeStudentQrIdentityInput(qrIdentityDraft);

    if (normalizedQrIdentity.length === 0) {
      setPanelError("Enter or scan a student QR identity before resolving the preview.");
      return;
    }

    startTransition(() => {
      setPanelError(null);
      setSubmittedQrIdentity(normalizedQrIdentity);
      setSelectedCvProfileId(null);
    });
    onInterviewDraftChange(null);
  };

  return (
    <Card className="overflow-hidden border-border/70">
      <CardHeader className="gap-3 border-b border-border/60 bg-muted/36">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="warning" size="lg" className="rounded-full px-4">
                Interview start
              </Badge>
              <Badge variant="outline" size="lg" className="rounded-full px-4">
                Scan, preview, confirm
              </Badge>
            </div>
            <CardTitle>Interview launchpad</CardTitle>
            <CardDescription>
              Resolve a student first, reuse the remembered recruiter when available, then explicitly confirm the interview start with the intended CV.
            </CardDescription>
          </div>

          {startedInterview != null && (
            <Button variant="outline" onClick={resetInterviewStart}>
              Reset flow
              <Undo2Icon />
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent className="grid gap-6 p-6 lg:grid-cols-[minmax(0,320px)_minmax(0,1fr)]">
        <div className="grid gap-4">
          <form
            className="grid gap-3 rounded-[1.5rem] border border-border/70 bg-background/72 p-4"
            onSubmit={submitQrIdentity}
          >
            <div className="space-y-2">
              <Label htmlFor="company-student-qr">Student QR identity</Label>
              <Input
                id="company-student-qr"
                onChange={(event) => {
                  setQrIdentityDraft(event.currentTarget.value);
                }}
                placeholder="student:v1:student-123"
                value={qrIdentityDraft}
              />
            </div>
            <div className="flex flex-wrap gap-2">
              <Button type="submit">
                Resolve preview
                <ScanLineIcon />
              </Button>
              {submittedQrIdentity != null && (
                <Button onClick={resetInterviewStart} type="button" variant="outline">
                  Clear scan
                  <Undo2Icon />
                </Button>
              )}
            </div>
          </form>

          <Card className="border-border/60 bg-background/72">
            <CardContent className="grid gap-3 p-4">
              <div className="flex items-center justify-between gap-3">
                <p className="font-medium text-sm">Recruiter context</p>
                <Badge variant="outline" size="lg" className="rounded-full px-4">
                  {recruiters.length} recruiters
                </Badge>
              </div>

              {company == null ? (
                <p className="text-muted-foreground text-sm">
                  Create the company profile before starting interviews on this device.
                </p>
              ) : recruiters.length === 0 ? (
                <p className="text-muted-foreground text-sm">
                  Add at least one recruiter before this company can start interviews.
                </p>
              ) : (
                <>
                  <p className="text-muted-foreground text-sm">
                    {rememberedRecruiter == null
                      ? "No remembered recruiter is available on this device yet. Choose one after the student preview resolves."
                      : `This device will reuse ${rememberedRecruiter.name} until you switch recruiters.`}
                  </p>
                  <div className="grid gap-2">
                    {recruiters.map((recruiter) => (
                      <SelectionCard
                        badgeLabel={
                          selectedRecruiterId === recruiter.id ? "Selected" : "Ready"
                        }
                        description={
                          rememberedRecruiter?.id === recruiter.id
                            ? "Remembered on this device"
                            : "Available recruiter"
                        }
                        key={recruiter.id}
                        label={recruiter.name}
                        onClick={() => rememberRecruiter(recruiter.id)}
                        selected={selectedRecruiterId === recruiter.id}
                      />
                    ))}
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {(panelError != null || startedInterview != null) && (
            <div className="flex flex-wrap gap-3">
              {panelError != null && (
                <Badge variant="error" size="lg" className="rounded-full px-4">
                  {panelError}
                </Badge>
              )}
              {startedInterview != null && (
                <Badge variant="success" size="lg" className="rounded-full px-4">
                  Interview staged for {startedInterview.student.firstName} {startedInterview.student.lastName}
                </Badge>
              )}
            </div>
          )}
        </div>

        {companyStatus === "loading" ? (
          <ResolvedStudentSkeleton />
        ) : companyStatus === "failure" ? (
          <InterviewStartFailure
            message={companyErrorMessage ?? "The company profile could not be loaded."}
            onReset={resetInterviewStart}
          />
        ) : company == null ? (
          <InterviewStartEmpty
            description="The company profile must exist before interview setup can resolve recruiters."
            title="Company profile missing"
          />
        ) : submittedQrIdentity == null ? (
          <InterviewStartEmpty
            description="Scan a badge or paste the student QR identity to load the preview, recruiter context, and CV choices."
            title="Awaiting student scan"
          />
        ) : (
          <ResolvedStudentInterviewPanel
            company={company}
            onConfirmStart={(draft) => {
              startTransition(() => {
                setPanelError(null);
              });
              onInterviewDraftChange(draft);
            }}
            onReset={resetInterviewStart}
            onSelectCvProfileId={(cvProfileId) => {
              startTransition(() => {
                setSelectedCvProfileId(cvProfileId);
              });
              onInterviewDraftChange(null);
            }}
            onSelectRecruiterId={rememberRecruiter}
            qrIdentity={submittedQrIdentity}
            selectedCvProfileId={selectedCvProfileId}
            selectedRecruiterId={selectedRecruiterId}
            startedInterview={startedInterview}
          />
        )}
      </CardContent>
    </Card>
  );
}

function ResolvedStudentInterviewPanel(props: {
  readonly company: Company;
  readonly onConfirmStart: (draft: CompanyInterviewDraft) => void;
  readonly onReset: () => void;
  readonly onSelectCvProfileId: (cvProfileId: CvProfile["id"] | null) => void;
  readonly onSelectRecruiterId: (recruiterId: Recruiter["id"]) => void;
  readonly qrIdentity: string;
  readonly selectedCvProfileId: CvProfile["id"] | null;
  readonly selectedRecruiterId: Recruiter["id"] | null;
  readonly startedInterview: CompanyInterviewDraft | null;
}): React.ReactElement {
  const studentAtom = useMemo(
    () => companyWorkspaceAtoms.resolveStudentQrIdentity(props.qrIdentity),
    [props.qrIdentity],
  );
  const studentResult = useAtomValue(studentAtom);
  const studentState = toAsyncPanelState(
    studentResult,
    "The scanned QR code did not resolve to a student preview.",
  );

  if (studentState.kind === "loading") {
    return <ResolvedStudentSkeleton />;
  }

  if (studentState.kind === "failure") {
    return (
      <InterviewStartFailure
        message={studentState.message}
        onReset={props.onReset}
      />
    );
  }

  return (
    <ResolvedStudentCvPanel
      company={props.company}
      onConfirmStart={props.onConfirmStart}
      onReset={props.onReset}
      onSelectCvProfileId={props.onSelectCvProfileId}
      onSelectRecruiterId={props.onSelectRecruiterId}
      qrIdentity={props.qrIdentity}
      selectedCvProfileId={props.selectedCvProfileId}
      selectedRecruiterId={props.selectedRecruiterId}
      startedInterview={props.startedInterview}
      student={studentState.value}
    />
  );
}

function ResolvedStudentCvPanel(props: {
  readonly company: Company;
  readonly onConfirmStart: (draft: CompanyInterviewDraft) => void;
  readonly onReset: () => void;
  readonly onSelectCvProfileId: (cvProfileId: CvProfile["id"] | null) => void;
  readonly onSelectRecruiterId: (recruiterId: Recruiter["id"]) => void;
  readonly qrIdentity: string;
  readonly selectedCvProfileId: CvProfile["id"] | null;
  readonly selectedRecruiterId: Recruiter["id"] | null;
  readonly startedInterview: CompanyInterviewDraft | null;
  readonly student: Student;
}): React.ReactElement {
  const cvProfilesAtom = useMemo(
    () => companyWorkspaceAtoms.listStudentCvProfiles(props.student.id),
    [props.student.id],
  );
  const cvProfilesResult = useAtomValue(cvProfilesAtom);
  const cvProfilesState = toAsyncPanelState(
    cvProfilesResult,
    "The student preview loaded, but their CV list could not be retrieved.",
  );

  if (cvProfilesState.kind === "loading") {
    return <ResolvedStudentSkeleton />;
  }

  if (cvProfilesState.kind === "failure") {
    return (
      <InterviewStartFailure
        message={cvProfilesState.message}
        onReset={props.onReset}
      />
    );
  }

  return (
    <ResolvedStudentCvSuccessPanel
      company={props.company}
      cvProfiles={cvProfilesState.value}
      onConfirmStart={props.onConfirmStart}
      onReset={props.onReset}
      onSelectCvProfileId={props.onSelectCvProfileId}
      onSelectRecruiterId={props.onSelectRecruiterId}
      qrIdentity={props.qrIdentity}
      selectedCvProfileId={props.selectedCvProfileId}
      selectedRecruiterId={props.selectedRecruiterId}
      startedInterview={props.startedInterview}
      student={props.student}
    />
  );
}

function ResolvedStudentCvSuccessPanel(props: {
  readonly company: Company;
  readonly cvProfiles: ReadonlyArray<CvProfile>;
  readonly onConfirmStart: (draft: CompanyInterviewDraft) => void;
  readonly onReset: () => void;
  readonly onSelectCvProfileId: (cvProfileId: CvProfile["id"] | null) => void;
  readonly onSelectRecruiterId: (recruiterId: Recruiter["id"]) => void;
  readonly qrIdentity: string;
  readonly selectedCvProfileId: CvProfile["id"] | null;
  readonly selectedRecruiterId: Recruiter["id"] | null;
  readonly startedInterview: CompanyInterviewDraft | null;
  readonly student: Student;
}): React.ReactElement {
  const cvProfiles = props.cvProfiles;
  const selectedCvProfileId = resolveInterviewStartCvProfileId(
    cvProfiles,
    props.selectedCvProfileId,
  );

  useEffect(() => {
    if (selectedCvProfileId !== props.selectedCvProfileId) {
      props.onSelectCvProfileId(selectedCvProfileId);
    }
  }, [props.onSelectCvProfileId, props.selectedCvProfileId, selectedCvProfileId]);

  const selectedRecruiter =
    props.company.recruiters.find((recruiter) => recruiter.id === props.selectedRecruiterId) ??
    null;
  const selectedCvProfile =
    cvProfiles.find((cvProfile) => cvProfile.id === selectedCvProfileId) ?? null;
  const checklist = summarizeInterviewStartChecklist({
    hasResolvedStudent: true,
    selectedRecruiterId: selectedRecruiter?.id ?? null,
    selectedCvProfileId,
  });

  return (
    <div className="grid gap-4">
      <Card className="border-border/60 bg-background/72">
        <CardContent className="grid gap-5 p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="info" size="lg" className="rounded-full px-4">
                  Student preview
                </Badge>
                <Badge variant="outline" size="lg" className="rounded-full px-4">
                  {props.student.course}
                </Badge>
              </div>
              <div>
                <h3 className="font-heading text-3xl tracking-tight">
                  {props.student.firstName} {props.student.lastName}
                </h3>
                <p className="text-muted-foreground text-sm">
                  QR identity resolved from {props.qrIdentity}
                </p>
              </div>
            </div>

            <div className="grid gap-2 text-right">
              <span className="text-muted-foreground text-xs uppercase tracking-[0.24em]">
                Start checklist
              </span>
              <div className="flex flex-wrap justify-end gap-2">
                {checklist.map((item) => (
                  <Badge
                    className="rounded-full px-4"
                    key={item.label}
                    size="lg"
                    variant={item.done ? "success" : "outline"}
                  >
                    {item.label}
                  </Badge>
                ))}
              </div>
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)]">
            <div className="grid gap-3">
              <div className="space-y-1">
                <p className="font-medium text-sm">Choose the recruiter for this session</p>
                <p className="text-muted-foreground text-sm">
                  The remembered recruiter is reused automatically, but you can switch before you confirm the start.
                </p>
              </div>
              <div className="grid gap-2">
                {props.company.recruiters.map((recruiter) => (
                  <SelectionCard
                    badgeLabel={props.selectedRecruiterId === recruiter.id ? "Selected" : "Use"}
                    description={
                      props.selectedRecruiterId === recruiter.id
                        ? "Selected for this interview"
                        : "Tap to assign this recruiter"
                    }
                    key={recruiter.id}
                    label={recruiter.name}
                    onClick={() => props.onSelectRecruiterId(recruiter.id)}
                    selected={props.selectedRecruiterId === recruiter.id}
                  />
                ))}
              </div>
            </div>

            <div className="grid gap-3">
              <div className="space-y-1">
                <p className="font-medium text-sm">Choose the student CV</p>
                <p className="text-muted-foreground text-sm">
                  The interview start remains blocked until the recruiter picks the CV they intend to discuss.
                </p>
              </div>
              {cvProfiles.length > 0 ? (
                <div className="grid gap-2">
                  {cvProfiles.map((cvProfile) => (
                    <SelectionCard
                      badgeLabel={`${Math.round(cvProfile.fileSizeBytes / 1024)} KB`}
                      description={`${cvProfile.profileType.label} · ${cvProfile.fileName}`}
                      key={cvProfile.id}
                      label={cvProfile.fileName}
                      onClick={() => props.onSelectCvProfileId(cvProfile.id)}
                      selected={selectedCvProfileId === cvProfile.id}
                      title={cvProfile.fileName}
                    />
                  ))}
                </div>
              ) : (
                <Empty className="rounded-[1.5rem] border border-dashed border-border/70 bg-card/72 py-10">
                  <EmptyHeader>
                    <EmptyMedia variant="icon">
                      <CircleAlertIcon />
                    </EmptyMedia>
                    <EmptyTitle>No CVs available</EmptyTitle>
                    <EmptyDescription>
                      This student does not currently have a CV uploaded, so the interview cannot start yet.
                    </EmptyDescription>
                  </EmptyHeader>
                </Empty>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Button
              disabled={
                !canConfirmInterviewStart({
                  hasResolvedStudent: true,
                  selectedRecruiterId: selectedRecruiter?.id ?? null,
                  selectedCvProfileId,
                })
              }
              onClick={() => {
                if (!selectedRecruiter || !selectedCvProfile) {
                  return;
                }

                props.onConfirmStart({
                  student: props.student,
                  recruiter: selectedRecruiter,
                  cvProfile: selectedCvProfile,
                  qrIdentity: props.qrIdentity,
                });
              }}
            >
              Confirm interview start
              <ArrowRightIcon />
            </Button>
            {props.startedInterview != null && (
              <Badge variant="success" size="lg" className="rounded-full px-4">
                {props.startedInterview.recruiter.name} with {props.startedInterview.cvProfile.fileName}
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function SelectionCard(props: {
  readonly badgeLabel?: string;
  readonly description: string;
  readonly label: string;
  readonly onClick: () => void;
  readonly selected: boolean;
  readonly title?: string;
}): React.ReactElement {
  return (
    <button
      className={`rounded-[1.25rem] border p-3 text-left transition-colors ${
        props.selected
          ? "border-warning/60 bg-warning/10"
          : "border-border/70 bg-card/72 hover:border-warning/40 hover:bg-warning/6"
      }`}
      onClick={props.onClick}
      type="button"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <p className="font-medium text-sm">{props.title ?? props.label}</p>
          <p className="text-muted-foreground text-xs">{props.description}</p>
        </div>
        <Badge
          className="rounded-full px-4"
          size="lg"
          variant={props.selected ? "warning" : "outline"}
        >
          {props.badgeLabel ?? props.label}
        </Badge>
      </div>
    </button>
  );
}

function InterviewStartFailure(props: {
  readonly message: string;
  readonly onReset: () => void;
}): React.ReactElement {
  return (
    <Empty className="rounded-[1.5rem] border border-dashed border-border/70 bg-background/72 py-10">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <CircleAlertIcon />
        </EmptyMedia>
        <EmptyTitle>Preview unavailable</EmptyTitle>
        <EmptyDescription>{props.message}</EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        <Button onClick={props.onReset} variant="outline">
          Reset interview flow
          <RefreshCwIcon />
        </Button>
      </EmptyContent>
    </Empty>
  );
}

function InterviewStartEmpty(props: {
  readonly description: string;
  readonly title: string;
}): React.ReactElement {
  return (
    <Empty className="rounded-[1.5rem] border border-dashed border-border/70 bg-background/72 py-14">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <UserRoundIcon />
        </EmptyMedia>
        <EmptyTitle>{props.title}</EmptyTitle>
        <EmptyDescription>{props.description}</EmptyDescription>
      </EmptyHeader>
    </Empty>
  );
}

function ResolvedStudentSkeleton(): React.ReactElement {
  return (
    <div className="grid gap-4">
      <Skeleton className="h-40 w-full rounded-[1.75rem]" />
      <Skeleton className="h-48 w-full rounded-[1.75rem]" />
    </div>
  );
}
