"use client";

import { useAtomRefresh, useAtomSet, useAtomValue } from "@effect/atom-react";
import * as AsyncResult from "effect/unstable/reactivity/AsyncResult";
import { Alert, AlertDescription, AlertTitle } from "@project/ui/components/alert";
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
import { Field, FieldDescription, FieldLabel } from "@project/ui/components/field";
import { Input } from "@project/ui/components/input";
import { Progress, ProgressIndicator, ProgressTrack } from "@project/ui/components/progress";
import { Separator } from "@project/ui/components/separator";
import { Skeleton } from "@project/ui/components/skeleton";
import type { CvProfile, CvProfileType, UserRoleValue } from "@project/domain";
import {
  CheckCircle2Icon,
  CopyIcon,
  FileCheck2Icon,
  GraduationCapIcon,
  IdCardIcon,
  LogOutIcon,
  RefreshCwIcon,
  ShieldCheckIcon,
  Trash2Icon,
  TriangleAlertIcon,
  UploadIcon,
} from "lucide-react";
import type React from "react";
import { startTransition, useEffect, useEffectEvent, useState } from "react";

import { authClient } from "@/lib/auth-client";
import { getRoleHomePath } from "@/lib/auth-routing";
import { studentWorkspaceAtoms, studentWorkspaceReactivity } from "@/lib/student-atoms";
import {
  formatFileSize,
  formatStudentDisplayName,
  summarizeStudentWorkspace,
} from "@/lib/student-workspace";

const formatMutationError = (error: unknown): string => {
  if (error instanceof Error && error.message.trim().length > 0) {
    return error.message;
  }

  return "The student workspace update did not complete. Refresh and try again.";
};

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

const readFileAsBase64 = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onerror = () => {
      reject(new Error("The selected CV file could not be read."));
    };

    reader.onload = () => {
      if (typeof reader.result !== "string") {
        reject(new Error("The selected CV file could not be encoded."));
        return;
      }

      const base64 = reader.result.split(",", 2)[1];

      if (!base64) {
        reject(new Error("The selected CV file did not contain uploadable contents."));
        return;
      }

      resolve(base64);
    };

    reader.readAsDataURL(file);
  });

const acceptedCvFileTypes = ".pdf,.doc,.docx";

export function StudentWorkspace(): React.ReactElement {
  const session = authClient.useSession();
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [firstNameDraft, setFirstNameDraft] = useState("");
  const [lastNameDraft, setLastNameDraft] = useState("");
  const [courseDraft, setCourseDraft] = useState("");
  const [selectedProfileTypeId, setSelectedProfileTypeId] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileInputResetKey, setFileInputResetKey] = useState(0);
  const [isCopyingQrIdentity, setIsCopyingQrIdentity] = useState(false);
  const [workspaceMessage, setWorkspaceMessage] = useState<string | null>(null);
  const [workspaceError, setWorkspaceError] = useState<string | null>(null);

  const currentStudentResult = useAtomValue(studentWorkspaceAtoms.currentStudent);
  const cvProfilesResult = useAtomValue(studentWorkspaceAtoms.cvProfiles);
  const cvProfileTypesResult = useAtomValue(studentWorkspaceAtoms.cvProfileTypes);
  const qrIdentityResult = useAtomValue(studentWorkspaceAtoms.qrIdentity);

  const refreshCurrentStudent = useAtomRefresh(studentWorkspaceAtoms.currentStudent);
  const refreshCvProfiles = useAtomRefresh(studentWorkspaceAtoms.cvProfiles);
  const refreshCvProfileTypes = useAtomRefresh(studentWorkspaceAtoms.cvProfileTypes);
  const refreshQrIdentity = useAtomRefresh(studentWorkspaceAtoms.qrIdentity);

  const saveOnboarding = useAtomSet(studentWorkspaceAtoms.upsertStudentOnboarding, {
    mode: "promise",
  });
  const createCvProfile = useAtomSet(studentWorkspaceAtoms.createStudentCvProfile, {
    mode: "promise",
  });
  const deleteCvProfile = useAtomSet(studentWorkspaceAtoms.deleteStudentCvProfile, {
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

    if (currentRole !== "student") {
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

  const studentState = toAsyncPanelState(
    currentStudentResult,
    "Your onboarding record could not be loaded from the student contract.",
  );
  const cvProfilesState = toAsyncPanelState(
    cvProfilesResult,
    "Your CV profiles could not be loaded from the CV contract.",
  );
  const cvProfileTypesState = toAsyncPanelState(
    cvProfileTypesResult,
    "The CV profile type list could not be loaded.",
  );

  const student = studentState.kind === "success" ? studentState.value : null;
  const cvProfiles = cvProfilesState.kind === "success" ? cvProfilesState.value : [];
  const cvProfileTypes = cvProfileTypesState.kind === "success" ? cvProfileTypesState.value : [];

  useEffect(() => {
    if (student == null) {
      setFirstNameDraft("");
      setLastNameDraft("");
      setCourseDraft("");
      return;
    }

    setFirstNameDraft(student.firstName);
    setLastNameDraft(student.lastName);
    setCourseDraft(student.course);
  }, [student]);

  useEffect(() => {
    if (selectedProfileTypeId != null) {
      return;
    }

    if (cvProfileTypes.length > 0) {
      setSelectedProfileTypeId(cvProfileTypes[0]!.id);
    }
  }, [cvProfileTypes, selectedProfileTypeId]);

  const summary = summarizeStudentWorkspace({
    student,
    cvProfiles,
  });

  const refreshWorkspace = () => {
    refreshCurrentStudent();
    refreshCvProfiles();
    refreshCvProfileTypes();
    refreshQrIdentity();
  };

  const submitOnboarding = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const firstName = firstNameDraft.trim();
    const lastName = lastNameDraft.trim();
    const course = courseDraft.trim();

    if (firstName.length === 0 || lastName.length === 0 || course.length === 0) {
      setWorkspaceError("First name, last name, and course are all required.");
      return;
    }

    setWorkspaceError(null);
    setWorkspaceMessage(null);

    try {
      await saveOnboarding({
        payload: { firstName, lastName, course },
        reactivityKeys: {
          currentStudent: studentWorkspaceReactivity.currentStudent,
          qrIdentity: studentWorkspaceReactivity.qrIdentity,
        },
      });
      refreshQrIdentity();
      startTransition(() => {
        setWorkspaceMessage(student == null ? "Onboarding profile created." : "Onboarding profile updated.");
      });
    } catch (error) {
      setWorkspaceError(formatMutationError(error));
    }
  };

  const submitCvUpload = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!summary.hasOnboardingProfile) {
      setWorkspaceError("Complete onboarding before uploading CV profiles.");
      return;
    }

    if (selectedProfileTypeId == null) {
      setWorkspaceError("Choose a CV profile type before uploading.");
      return;
    }

    if (selectedFile == null) {
      setWorkspaceError("Choose a CV file before uploading.");
      return;
    }

    setWorkspaceError(null);
    setWorkspaceMessage(null);

    try {
      const contentsBase64 = await readFileAsBase64(selectedFile);

      await createCvProfile({
        payload: {
          profileTypeId: selectedProfileTypeId,
          fileName: selectedFile.name,
          contentType: selectedFile.type || "application/octet-stream",
          contentsBase64,
        },
        reactivityKeys: studentWorkspaceReactivity.cvProfiles,
      });

      startTransition(() => {
        setSelectedFile(null);
        setFileInputResetKey((value) => value + 1);
        setWorkspaceMessage(`${selectedFile.name} uploaded as a CV profile.`);
      });
    } catch (error) {
      setWorkspaceError(formatMutationError(error));
    }
  };

  const removeCvProfile = async (cvProfile: CvProfile) => {
    setWorkspaceError(null);
    setWorkspaceMessage(null);

    try {
      await deleteCvProfile({
        payload: { cvProfileId: cvProfile.id },
        reactivityKeys: studentWorkspaceReactivity.cvProfiles,
      });
      startTransition(() => {
        setWorkspaceMessage(`${cvProfile.fileName} removed from your CV library.`);
      });
    } catch (error) {
      setWorkspaceError(formatMutationError(error));
    }
  };

  const copyQrIdentity = async () => {
    if (!summary.qrIdentityAvailable || AsyncResult.isFailure(qrIdentityResult)) {
      return;
    }

    if (AsyncResult.isInitial(qrIdentityResult)) {
      return;
    }

    setIsCopyingQrIdentity(true);
    setWorkspaceError(null);
    setWorkspaceMessage(null);

    try {
      await navigator.clipboard.writeText(qrIdentityResult.value);
      startTransition(() => {
        setWorkspaceMessage("Student QR identity copied.");
      });
    } catch {
      setWorkspaceError("Clipboard access was not available. Copy the QR identity manually.");
    } finally {
      setIsCopyingQrIdentity(false);
    }
  };

  const readinessTone = summary.isEventReady
    ? {
        badge: "Event-ready",
        icon: ShieldCheckIcon,
      }
    : {
        badge: "Needs action",
        icon: TriangleAlertIcon,
      };

  const headingName = formatStudentDisplayName(student);
  const qrIdentityText = AsyncResult.isSuccess(qrIdentityResult) ? qrIdentityResult.value : null;

  const cvProfilesByType = cvProfiles.reduce<Map<CvProfileType["id"], Array<CvProfile>>>(
    (map, profile) => {
      const existing = map.get(profile.profileType.id) ?? [];
      existing.push(profile);
      map.set(profile.profileType.id, existing);
      return map;
    },
    new Map(),
  );

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_hsl(var(--info)/0.14),_transparent_42%),linear-gradient(180deg,_hsl(var(--background)),_hsl(var(--muted)/0.42))] px-4 py-6 text-foreground sm:px-6 sm:py-8">
      <div className="mx-auto flex max-w-6xl flex-col gap-6">
        <Card className="overflow-hidden border-border/60 bg-card/92 shadow-sm">
          <CardHeader className="gap-6 border-b border-border/60 bg-[linear-gradient(135deg,_hsl(var(--info)/0.1),_transparent_40%),radial-gradient(circle_at_top_right,_hsl(var(--warning)/0.18),_transparent_35%)]">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="space-y-4">
                <div className="flex flex-wrap gap-3">
                  <Badge variant="outline" size="lg" className="rounded-full px-4">
                    Student workspace
                  </Badge>
                  <Badge variant={summary.isEventReady ? "secondary" : "outline"} size="lg" className="rounded-full px-4">
                    <readinessTone.icon className="size-4" />
                    {readinessTone.badge}
                  </Badge>
                </div>

                <div className="space-y-2">
                  <CardTitle className="font-heading text-4xl tracking-tight sm:text-5xl">
                    CV-first home for {headingName}
                  </CardTitle>
                  <CardDescription className="max-w-3xl text-base text-muted-foreground">
                    Keep your profile event-ready from one mobile-first surface: finish onboarding,
                    manage CV variants, and expose the QR identity recruiters will scan.
                  </CardDescription>
                </div>
              </div>

              <div className="flex flex-col gap-2 sm:items-end">
                <Button variant="outline" onClick={refreshWorkspace}>
                  <RefreshCwIcon />
                  Refresh workspace
                </Button>
                <Button loading={isSigningOut} variant="outline" onClick={handleSignOut}>
                  Sign out
                  <LogOutIcon />
                </Button>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <Card className="border-border/60 bg-background/80">
                <CardContent className="flex items-center justify-between gap-3 p-4">
                  <div>
                    <p className="text-muted-foreground text-xs uppercase tracking-[0.24em]">Readiness</p>
                    <p className="mt-1 font-semibold text-lg">{summary.completionPercent}%</p>
                  </div>
                  <GraduationCapIcon className="size-5 text-primary" />
                </CardContent>
              </Card>
              <Card className="border-border/60 bg-background/80">
                <CardContent className="flex items-center justify-between gap-3 p-4">
                  <div>
                    <p className="text-muted-foreground text-xs uppercase tracking-[0.24em]">CV profiles</p>
                    <p className="mt-1 font-semibold text-lg">{cvProfiles.length}</p>
                  </div>
                  <FileCheck2Icon className="size-5 text-primary" />
                </CardContent>
              </Card>
              <Card className="border-border/60 bg-background/80">
                <CardContent className="flex items-center justify-between gap-3 p-4">
                  <div>
                    <p className="text-muted-foreground text-xs uppercase tracking-[0.24em]">QR access</p>
                    <p className="mt-1 font-semibold text-lg">
                      {summary.qrIdentityAvailable ? "Unlocked" : "Locked"}
                    </p>
                  </div>
                  <IdCardIcon className="size-5 text-primary" />
                </CardContent>
              </Card>
            </div>
          </CardHeader>
        </Card>

        {workspaceError ? (
          <Alert variant="error">
            <TriangleAlertIcon />
            <AlertTitle>Workspace update failed</AlertTitle>
            <AlertDescription>{workspaceError}</AlertDescription>
          </Alert>
        ) : null}

        {workspaceMessage ? (
          <Alert variant="success">
            <CheckCircle2Icon />
            <AlertTitle>Workspace updated</AlertTitle>
            <AlertDescription>{workspaceMessage}</AlertDescription>
          </Alert>
        ) : null}

        <div className="grid gap-6 xl:grid-cols-[0.92fr_1.08fr]">
          <div className="grid gap-6">
            <Card className="border-border/60 bg-card/90">
              <CardHeader>
                <CardTitle className="font-heading text-2xl">Readiness gate</CardTitle>
                <CardDescription>
                  You are only treated as event-ready once the profile is complete and at least one CV is on file.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                <Progress className="gap-3" value={summary.completionPercent}>
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium">Event readiness</span>
                    <span className="tabular-nums">{summary.completionPercent}%</span>
                  </div>
                  <ProgressTrack>
                    <ProgressIndicator style={{ width: `${summary.completionPercent}%` }} />
                  </ProgressTrack>
                </Progress>

                <Alert variant={summary.isEventReady ? "success" : "warning"}>
                  {summary.isEventReady ? <ShieldCheckIcon /> : <TriangleAlertIcon />}
                  <AlertTitle>{summary.isEventReady ? "Ready for recruiters" : "Action required"}</AlertTitle>
                  <AlertDescription>{summary.nextStepLabel}</AlertDescription>
                </Alert>

                <div className="grid gap-3">
                  {summary.checklist.map((item) => (
                    <div
                      key={item.id}
                      className="rounded-2xl border border-border/60 bg-background/80 p-4"
                    >
                      <div className="flex items-start gap-3">
                        <div
                          className={`mt-0.5 rounded-full p-1 ${
                            item.done ? "bg-primary/14 text-primary" : "bg-muted text-muted-foreground"
                          }`}
                        >
                          <CheckCircle2Icon className="size-4" />
                        </div>
                        <div className="space-y-1">
                          <p className="font-medium text-sm">{item.label}</p>
                          <p className="text-muted-foreground text-sm">{item.description}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card className="border-border/60 bg-card/90">
              <CardHeader>
                <CardTitle className="font-heading text-2xl">Student QR identity</CardTitle>
                <CardDescription>
                  Recruiters use this transport-safe identity string during on-site scanning.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {!summary.qrIdentityAvailable ? (
                  <Empty className="items-start rounded-[1.5rem] border border-dashed border-border/70 bg-background/80 p-5 text-left">
                    <EmptyHeader className="items-start text-left">
                      <EmptyMedia variant="icon" className="size-11 rounded-2xl">
                        <IdCardIcon className="size-5" />
                      </EmptyMedia>
                      <EmptyTitle>Complete onboarding first</EmptyTitle>
                      <EmptyDescription>
                        Your QR identity becomes available as soon as your onboarding profile is saved.
                      </EmptyDescription>
                    </EmptyHeader>
                  </Empty>
                ) : AsyncResult.isInitial(qrIdentityResult) ? (
                  <div className="rounded-[1.5rem] border border-border/60 bg-background/80 p-5">
                    <Skeleton className="h-5 w-40" />
                    <Skeleton className="mt-3 h-14 w-full rounded-2xl" />
                  </div>
                ) : AsyncResult.isFailure(qrIdentityResult) ? (
                  <Alert variant="warning">
                    <TriangleAlertIcon />
                    <AlertTitle>QR identity unavailable</AlertTitle>
                    <AlertDescription>
                      The student contract did not return a QR identity yet. Refresh after saving onboarding.
                    </AlertDescription>
                  </Alert>
                ) : (
                  <div className="space-y-4 rounded-[1.5rem] border border-border/60 bg-background/88 p-5">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-muted-foreground text-xs uppercase tracking-[0.22em]">Current identity</p>
                        <p className="mt-1 font-medium text-sm">{headingName}</p>
                      </div>
                      <Button
                        loading={isCopyingQrIdentity}
                        size="sm"
                        variant="outline"
                        onClick={copyQrIdentity}
                      >
                        Copy
                        <CopyIcon />
                      </Button>
                    </div>
                    <div className="overflow-x-auto rounded-2xl border border-border/60 bg-muted/40 px-4 py-3 font-mono text-sm">
                      {qrIdentityText}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-6">
            <Card className="border-border/60 bg-card/90">
              <CardHeader>
                <CardTitle className="font-heading text-2xl">Onboarding profile</CardTitle>
                <CardDescription>
                  Capture the required event fields once, then keep them current from the same landing surface.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {studentState.kind === "loading" ? (
                  <div className="grid gap-4">
                    <Skeleton className="h-22 rounded-2xl" />
                    <Skeleton className="h-22 rounded-2xl" />
                    <Skeleton className="h-22 rounded-2xl" />
                  </div>
                ) : studentState.kind === "failure" ? (
                  <Alert variant="warning">
                    <TriangleAlertIcon />
                    <AlertTitle>Student profile unavailable</AlertTitle>
                    <AlertDescription>{studentState.message}</AlertDescription>
                  </Alert>
                ) : (
                  <form className="grid gap-4" onSubmit={submitOnboarding}>
                    <Field>
                      <FieldLabel htmlFor="student-first-name">First name</FieldLabel>
                      <Input
                        id="student-first-name"
                        name="firstName"
                        placeholder="Ada"
                        value={firstNameDraft}
                        onChange={(event) => setFirstNameDraft(event.currentTarget.value)}
                      />
                    </Field>
                    <Field>
                      <FieldLabel htmlFor="student-last-name">Last name</FieldLabel>
                      <Input
                        id="student-last-name"
                        name="lastName"
                        placeholder="Lovelace"
                        value={lastNameDraft}
                        onChange={(event) => setLastNameDraft(event.currentTarget.value)}
                      />
                    </Field>
                    <Field>
                      <FieldLabel htmlFor="student-course">Course</FieldLabel>
                      <Input
                        id="student-course"
                        name="course"
                        placeholder="Computer Science"
                        value={courseDraft}
                        onChange={(event) => setCourseDraft(event.currentTarget.value)}
                      />
                      <FieldDescription>
                        This is the minimum profile data shown to recruiter-facing flows today.
                      </FieldDescription>
                    </Field>
                    <Button className="w-full sm:w-auto" type="submit">
                      Save onboarding
                      <CheckCircle2Icon />
                    </Button>
                  </form>
                )}
              </CardContent>
            </Card>

            <Card className="border-border/60 bg-card/90">
              <CardHeader>
                <CardTitle className="font-heading text-2xl">CV library</CardTitle>
                <CardDescription>
                  Upload multiple variants and keep them grouped by the controlled profile vocabulary.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                {cvProfileTypesState.kind === "loading" ? (
                  <div className="grid gap-3">
                    <Skeleton className="h-10 rounded-full" />
                    <Skeleton className="h-10 rounded-full" />
                  </div>
                ) : cvProfileTypesState.kind === "failure" ? (
                  <Alert variant="warning">
                    <TriangleAlertIcon />
                    <AlertTitle>CV profile types unavailable</AlertTitle>
                    <AlertDescription>{cvProfileTypesState.message}</AlertDescription>
                  </Alert>
                ) : (
                  <form className="space-y-4" onSubmit={submitCvUpload}>
                    <div className="space-y-3">
                      <p className="font-medium text-sm">Choose CV profile type</p>
                      <div className="flex flex-wrap gap-2">
                        {cvProfileTypes.map((profileType) => (
                          <Button
                            key={profileType.id}
                            size="sm"
                            type="button"
                            variant={selectedProfileTypeId === profileType.id ? "default" : "outline"}
                            onClick={() => setSelectedProfileTypeId(profileType.id)}
                          >
                            {profileType.label}
                          </Button>
                        ))}
                      </div>
                    </div>

                    <Field>
                      <FieldLabel htmlFor="student-cv-upload">Upload file</FieldLabel>
                      <Input
                        key={fileInputResetKey}
                        accept={acceptedCvFileTypes}
                        id="student-cv-upload"
                        nativeInput
                        type="file"
                        onChange={(event) => {
                          const file = event.currentTarget.files?.[0] ?? null;
                          setSelectedFile(file);
                        }}
                      />
                      <FieldDescription>
                        Accepted formats: PDF, DOC, and DOCX. Onboarding must exist before upload.
                      </FieldDescription>
                    </Field>

                    {selectedFile ? (
                      <div className="rounded-2xl border border-border/60 bg-background/80 px-4 py-3 text-sm">
                        <p className="font-medium">{selectedFile.name}</p>
                        <p className="text-muted-foreground">
                          {selectedFile.type || "application/octet-stream"} · {formatFileSize(selectedFile.size)}
                        </p>
                      </div>
                    ) : null}

                    <Button className="w-full sm:w-auto" type="submit">
                      Upload CV
                      <UploadIcon />
                    </Button>
                  </form>
                )}

                <Separator />

                {cvProfilesState.kind === "loading" ? (
                  <div className="grid gap-3">
                    <Skeleton className="h-24 rounded-3xl" />
                    <Skeleton className="h-24 rounded-3xl" />
                  </div>
                ) : cvProfilesState.kind === "failure" ? (
                  <Alert variant="warning">
                    <TriangleAlertIcon />
                    <AlertTitle>CV library unavailable</AlertTitle>
                    <AlertDescription>{cvProfilesState.message}</AlertDescription>
                  </Alert>
                ) : cvProfiles.length === 0 ? (
                  <Empty className="items-start rounded-[1.5rem] border border-dashed border-border/70 bg-background/80 p-5 text-left">
                    <EmptyHeader className="items-start text-left">
                      <EmptyMedia variant="icon" className="size-11 rounded-2xl">
                        <FileCheck2Icon className="size-5" />
                      </EmptyMedia>
                      <EmptyTitle>No CV profiles yet</EmptyTitle>
                      <EmptyDescription>
                        Your first uploaded CV is what turns the profile from onboarded to event-ready.
                      </EmptyDescription>
                    </EmptyHeader>
                    <EmptyContent className="items-start text-left">
                      <Badge variant="outline" size="lg" className="rounded-full px-4">
                        {summary.hasOnboardingProfile ? "Ready to upload" : "Onboarding required first"}
                      </Badge>
                    </EmptyContent>
                  </Empty>
                ) : (
                  <div className="grid gap-4">
                    {cvProfileTypes.map((profileType) => {
                      const entries = cvProfilesByType.get(profileType.id) ?? [];

                      if (entries.length === 0) {
                        return null;
                      }

                      return (
                        <div
                          key={profileType.id}
                          className="rounded-[1.75rem] border border-border/60 bg-background/80 p-4"
                        >
                          <div className="mb-3 flex items-center justify-between gap-3">
                            <div>
                              <p className="font-medium">{profileType.label}</p>
                              <p className="text-muted-foreground text-sm">
                                {entries.length} variant{entries.length === 1 ? "" : "s"}
                              </p>
                            </div>
                            <Badge variant="outline" size="lg" className="rounded-full px-4">
                              {entries.length}
                            </Badge>
                          </div>
                          <div className="grid gap-3">
                            {entries.map((cvProfile) => (
                              <div
                                key={cvProfile.id}
                                className="flex flex-col gap-3 rounded-2xl border border-border/60 bg-card/90 p-4 sm:flex-row sm:items-center sm:justify-between"
                              >
                                <div className="space-y-1">
                                  <p className="font-medium text-sm">{cvProfile.fileName}</p>
                                  <p className="text-muted-foreground text-sm">
                                    {cvProfile.contentType} · {formatFileSize(cvProfile.fileSizeBytes)}
                                  </p>
                                </div>
                                <Button
                                  size="sm"
                                  variant="destructive-outline"
                                  onClick={() => void removeCvProfile(cvProfile)}
                                >
                                  Remove
                                  <Trash2Icon />
                                </Button>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </main>
  );
}
