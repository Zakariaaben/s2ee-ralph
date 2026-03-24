"use client";

import { useAtomRefresh, useAtomSet, useAtomValue } from "@effect/atom-react";
import * as AsyncResult from "effect/unstable/reactivity/AsyncResult";
import { Alert, AlertDescription, AlertTitle } from "@project/ui/components/alert";
import { Button } from "@project/ui/components/button";
import { Input } from "@project/ui/components/input";
import { Skeleton } from "@project/ui/components/skeleton";
import type { CvProfile } from "@project/domain";
import { useNavigate } from "@tanstack/react-router";
import {
  ArrowRightIcon,
  CircleAlertIcon,
  LogOutIcon,
  RefreshCwIcon,
  Trash2Icon,
  UploadIcon,
} from "lucide-react";
import type React from "react";
import { startTransition, useEffect, useState } from "react";

import { StudentOnboardingDialog } from "@/components/student/student-onboarding-dialog";
import { authClient } from "@/lib/auth-client";
import { studentWorkspaceAtoms, studentWorkspaceReactivity } from "@/lib/student-atoms";
import { formatFileSize, hasStudentOnboardingProfile } from "@/lib/student-workspace";

type AsyncPanelState<Value> =
  | { readonly kind: "loading" }
  | { readonly kind: "failure"; readonly message: string }
  | { readonly kind: "success"; readonly value: Value };

type StudentTab = "cvs" | "settings";

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

  return "The student workspace update did not complete. Refresh and try again.";
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

const acceptedCvFileTypes = ".pdf";
const hiddenStudentCvProfileTypeId = "default";

export function StudentWorkspace(): React.ReactElement {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<StudentTab>("cvs");
  const [hasCompletedOnboarding, setHasCompletedOnboarding] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [isSavingOnboarding, setIsSavingOnboarding] = useState(false);
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileInputResetKey, setFileInputResetKey] = useState(0);
  const [deletingProfileId, setDeletingProfileId] = useState<string | null>(null);
  const [workspaceMessage, setWorkspaceMessage] = useState<string | null>(null);
  const [workspaceError, setWorkspaceError] = useState<string | null>(null);
  const [onboardingMutationError, setOnboardingMutationError] = useState<string | null>(null);
  const [firstNameDraft, setFirstNameDraft] = useState("");
  const [lastNameDraft, setLastNameDraft] = useState("");
  const [phoneNumberDraft, setPhoneNumberDraft] = useState("");
  const [academicYearDraft, setAcademicYearDraft] = useState("");
  const [majorDraft, setMajorDraft] = useState("");
  const [institutionDraft, setInstitutionDraft] = useState("");

  const currentStudentResult = useAtomValue(studentWorkspaceAtoms.currentStudent);
  const cvsResult = useAtomValue(studentWorkspaceAtoms.cvProfiles);
  const refreshCurrentStudent = useAtomRefresh(studentWorkspaceAtoms.currentStudent);
  const refreshCvs = useAtomRefresh(studentWorkspaceAtoms.cvProfiles);

  const saveStudent = useAtomSet(studentWorkspaceAtoms.upsertStudentOnboarding, {
    mode: "promise",
  });
  const createCv = useAtomSet(studentWorkspaceAtoms.createStudentCvProfile, {
    mode: "promise",
  });
  const deleteCv = useAtomSet(studentWorkspaceAtoms.deleteStudentCvProfile, {
    mode: "promise",
  });

  const studentState = toAsyncPanelState(
    currentStudentResult,
    "Your student settings could not be loaded.",
  );
  const cvsState = toAsyncPanelState(
    cvsResult,
    "Your CV list could not be loaded.",
  );
  const student = studentState.kind === "success" ? studentState.value : null;
  const cvs = cvsState.kind === "success" ? cvsState.value : [];
  const sortedCvs = [...cvs].sort((left, right) => {
    const byFileName = left.fileName.localeCompare(right.fileName);
    if (byFileName !== 0) {
      return byFileName;
    }

    return left.id.localeCompare(right.id);
  });
  const onboardingRequired = studentState.kind === "success" && !hasStudentOnboardingProfile(student);

  useEffect(() => {
    if (studentState.kind !== "success") {
      return;
    }

    setFirstNameDraft(student?.firstName ?? "");
    setLastNameDraft(student?.lastName ?? "");
    setPhoneNumberDraft(student?.phoneNumber ?? "");
    setAcademicYearDraft(student?.academicYear ?? "");
    setMajorDraft(student?.major ?? "");
    setInstitutionDraft(student?.institution ?? "");
  }, [student, studentState.kind]);

  useEffect(() => {
    if (onboardingRequired) {
      setHasCompletedOnboarding(false);
    }
  }, [onboardingRequired]);

  const refreshWorkspace = () => {
    refreshCurrentStudent();
    refreshCvs();
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

  const submitStudentUpdate = async (payload: {
    readonly academicYear: string;
    readonly firstName: string;
    readonly image: string | null;
    readonly institution: string;
    readonly lastName: string;
    readonly major: string;
    readonly phoneNumber: string;
  }) => {
    await saveStudent({
      payload,
      reactivityKeys: {
        currentStudent: studentWorkspaceReactivity.currentStudent,
      },
    });
  };

  const submitOnboarding = async (payload: {
    readonly academicYear: string;
    readonly firstName: string;
    readonly image: string | null;
    readonly institution: string;
    readonly lastName: string;
    readonly major: string;
    readonly phoneNumber: string;
  }) => {
    setIsSavingOnboarding(true);
    setOnboardingMutationError(null);

    try {
      await submitStudentUpdate(payload);
      refreshCurrentStudent();
      setHasCompletedOnboarding(true);
      startTransition(() => {
        setWorkspaceMessage("Settings saved.");
      });
    } catch (error) {
      setOnboardingMutationError(formatMutationError(error));
    } finally {
      setIsSavingOnboarding(false);
    }
  };

  const saveSettings = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const firstName = firstNameDraft.trim();
    const lastName = lastNameDraft.trim();
    const phoneNumber = phoneNumberDraft.trim();
    const academicYear = academicYearDraft.trim();
    const major = majorDraft.trim();
    const institution = institutionDraft.trim();

    if (
      firstName.length === 0 ||
      lastName.length === 0 ||
      phoneNumber.length === 0 ||
      academicYear.length === 0 ||
      major.length === 0 ||
      institution.length === 0
    ) {
      setWorkspaceError("Complete every settings field before saving.");
      setActiveTab("settings");
      return;
    }

    setWorkspaceError(null);
    setWorkspaceMessage(null);
    setIsSavingSettings(true);

    try {
      await submitStudentUpdate({
        firstName,
        lastName,
        phoneNumber,
        academicYear,
        major,
        institution,
        image: student?.image ?? null,
      });
      refreshCurrentStudent();
      startTransition(() => {
        setWorkspaceMessage("Settings saved.");
      });
    } catch (error) {
      setWorkspaceError(formatMutationError(error));
      setActiveTab("settings");
    } finally {
      setIsSavingSettings(false);
    }
  };

  const submitCvUpload = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (studentState.kind !== "success") {
      setWorkspaceError("Wait until your student settings finish loading, then try again.");
      return;
    }

    if (selectedFile == null) {
      setWorkspaceError("Choose a CV file before uploading.");
      return;
    }

    if (selectedFile.type !== "application/pdf" && !selectedFile.name.toLowerCase().endsWith(".pdf")) {
      setWorkspaceError("Only PDF CV files are allowed.");
      return;
    }

    setWorkspaceError(null);
    setWorkspaceMessage(null);

    try {
      const contentsBase64 = await readFileAsBase64(selectedFile);

      await createCv({
        payload: {
          profileTypeId: hiddenStudentCvProfileTypeId,
          fileName: selectedFile.name,
          contentType: selectedFile.type || "application/octet-stream",
          contentsBase64,
        },
        reactivityKeys: studentWorkspaceReactivity.cvProfiles,
      });

      startTransition(() => {
        setSelectedFile(null);
        setFileInputResetKey((value) => value + 1);
        setWorkspaceMessage(`${selectedFile.name} uploaded.`);
      });
    } catch (error) {
      setWorkspaceError(formatMutationError(error));
    }
  };

  const removeCv = async (cv: CvProfile) => {
    const confirmed = window.confirm(`Delete ${cv.fileName}? This cannot be undone.`);
    if (!confirmed) {
      return;
    }

    setDeletingProfileId(cv.id);
    setWorkspaceError(null);
    setWorkspaceMessage(null);

    try {
      await deleteCv({
        payload: { cvProfileId: cv.id },
        reactivityKeys: studentWorkspaceReactivity.cvProfiles,
      });
      setWorkspaceMessage(`${cv.fileName} deleted.`);
    } catch (error) {
      setWorkspaceError(formatMutationError(error));
    } finally {
      setDeletingProfileId(null);
    }
  };

  return (
    <main className="min-h-[100dvh] bg-[var(--s2ee-canvas)] font-mono text-foreground">
      <header className="border-b bg-[var(--s2ee-surface-soft)] [border-color:var(--s2ee-border)]">
        <div className="mx-auto flex max-w-[1500px] flex-col gap-4 px-5 py-4 sm:px-8 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-3 text-[11px] font-bold uppercase tracking-[0.22em]">
              <span className="text-primary">S2EE</span>
              <span className="text-[color:var(--s2ee-muted-foreground)]">Student</span>
            </div>
            <div className="space-y-2">
              <h1 className="text-[clamp(2rem,5vw,3.25rem)] font-black tracking-[-0.08em] text-[color:var(--s2ee-soft-foreground)]">
                My CVs
              </h1>
              <p className="max-w-3xl text-sm leading-7 text-[color:var(--s2ee-soft-foreground)] sm:text-base">
                Upload CVs, open one when you need its QR and code, and update your personal settings when needed.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <Button
              className="rounded-none border-[var(--s2ee-border)] bg-[var(--s2ee-surface)] px-4 uppercase tracking-[0.18em] text-[color:var(--s2ee-soft-foreground)] shadow-none hover:bg-white"
              variant="outline"
              onClick={refreshWorkspace}
            >
              Refresh
              <RefreshCwIcon />
            </Button>
            <Button
              className="rounded-none border-[var(--s2ee-border)] bg-[var(--s2ee-surface)] px-4 uppercase tracking-[0.18em] text-[color:var(--s2ee-soft-foreground)] shadow-none hover:bg-white"
              loading={isSigningOut}
              variant="outline"
              onClick={handleSignOut}
            >
              Sign out
              <LogOutIcon />
            </Button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-[1500px] px-5 py-6 sm:px-8 sm:py-8">
        {(workspaceError || workspaceMessage || studentState.kind === "failure" || cvsState.kind === "failure") ? (
          <div className="mb-6 grid gap-3">
            {workspaceError ? (
              <Alert variant="error">
                <CircleAlertIcon className="size-4" />
                <AlertTitle>Update failed</AlertTitle>
                <AlertDescription>{workspaceError}</AlertDescription>
              </Alert>
            ) : null}
            {workspaceMessage ? (
              <Alert>
                <AlertTitle>Updated</AlertTitle>
                <AlertDescription>{workspaceMessage}</AlertDescription>
              </Alert>
            ) : null}
            {studentState.kind === "failure" ? (
              <Alert variant="warning">
                <CircleAlertIcon className="size-4" />
                <AlertTitle>Settings unavailable</AlertTitle>
                <AlertDescription>{studentState.message}</AlertDescription>
              </Alert>
            ) : null}
            {cvsState.kind === "failure" ? (
              <Alert variant="warning">
                <CircleAlertIcon className="size-4" />
                <AlertTitle>CV list unavailable</AlertTitle>
                <AlertDescription>{cvsState.message}</AlertDescription>
              </Alert>
            ) : null}
          </div>
        ) : null}

        <div className="mb-6 flex gap-2 border-b pb-4 [border-color:var(--s2ee-border)]">
          {[
            { id: "cvs", label: "CVs" },
            { id: "settings", label: "Settings" },
          ].map((tab) => (
            <button
              key={tab.id}
              className={[
                "min-h-11 border px-4 py-2 text-[11px] font-bold uppercase tracking-[0.18em] transition-colors",
                activeTab === tab.id
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-[var(--s2ee-border)] bg-[var(--s2ee-surface-soft)] text-[color:var(--s2ee-soft-foreground)] hover:bg-white",
              ].join(" ")}
              type="button"
              onClick={() => setActiveTab(tab.id as StudentTab)}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {activeTab === "cvs" ? (
          <section className="grid gap-0 lg:grid-cols-[20rem_minmax(0,1fr)]">
            <div className="border-b bg-[var(--s2ee-surface-soft)] p-5 sm:p-6 lg:border-b-0 lg:border-r [border-color:var(--s2ee-border)]">
              <div className="space-y-6">
                <div className="space-y-2">
                  <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-[color:var(--s2ee-muted-foreground)]">
                    Upload
                  </p>
                  <h2 className="text-2xl font-black tracking-[-0.06em] text-[color:var(--s2ee-soft-foreground)]">
                    Add CV
                  </h2>
                </div>

                <form className="grid gap-5" onSubmit={submitCvUpload}>
                  <div className="space-y-3">
                    <label
                      className="text-[10px] font-bold uppercase tracking-[0.22em] text-[color:var(--s2ee-muted-foreground)]"
                      htmlFor="student-cv-upload"
                    >
                      Select file
                    </label>
                    <div className="border bg-[var(--s2ee-surface)] p-4 [border-color:var(--s2ee-border)]">
                      <Input
                        key={fileInputResetKey}
                        accept={acceptedCvFileTypes}
                        className="rounded-none border-0 bg-transparent px-0 py-0 shadow-none before:shadow-none"
                        id="student-cv-upload"
                        nativeInput
                        type="file"
                        unstyled
                        onChange={(event) => {
                          const { files } = event.currentTarget;
                          setSelectedFile(files?.[0] ?? null);
                        }}
                      />
                    </div>
                    <p className="text-[11px] leading-6 text-[color:var(--s2ee-muted-foreground)]">
                        PDF files are supported.
                      </p>
                  </div>

                  {selectedFile ? (
                    <div className="border bg-[color:color-mix(in_srgb,var(--s2ee-surface-soft)_65%,white)] p-4 [border-color:var(--s2ee-border)]">
                      <p className="text-sm font-bold text-[color:var(--s2ee-soft-foreground)]">{selectedFile.name}</p>
                      <p className="mt-1 text-[11px] uppercase tracking-[0.16em] text-[color:var(--s2ee-muted-foreground)]">
                        {selectedFile.type || "application/octet-stream"} · {formatFileSize(selectedFile.size)}
                      </p>
                    </div>
                  ) : null}

                  <Button className="min-h-14 rounded-none px-6 py-4 text-sm uppercase tracking-[0.2em]" size="lg" type="submit">
                    Upload CV
                    <UploadIcon />
                  </Button>
                </form>
              </div>
            </div>

            <div className="bg-[var(--s2ee-surface)] p-5 sm:p-6">
              <div className="space-y-2">
                <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-[color:var(--s2ee-muted-foreground)]">
                  CVs
                </p>
                <h2 className="text-2xl font-black tracking-[-0.06em] text-[color:var(--s2ee-soft-foreground)]">
                  Library
                </h2>
              </div>

              <div className="mt-6">
                {cvsState.kind === "loading" ? (
                  <div className="grid gap-3">
                    <Skeleton className="h-24 rounded-none" />
                    <Skeleton className="h-24 rounded-none" />
                  </div>
                ) : sortedCvs.length === 0 ? (
                  <div className="border bg-[var(--s2ee-surface-soft)] p-6 [border-color:var(--s2ee-border)]">
                    <div className="space-y-3">
                      <p className="text-lg font-black tracking-[-0.05em] text-[color:var(--s2ee-soft-foreground)]">
                        No CVs yet
                      </p>
                      <p className="max-w-xl text-sm leading-7 text-[color:var(--s2ee-soft-foreground)]">
                        Upload your first CV from the left side, then open it when you need its QR and code.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between gap-3 border-b pb-3 [border-color:var(--s2ee-border)]">
                      <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-[color:var(--s2ee-muted-foreground)]">
                        {sortedCvs.length} file{sortedCvs.length === 1 ? "" : "s"}
                      </span>
                    </div>

                    <div className="divide-y [divide-color:var(--s2ee-border)] border-y [border-color:var(--s2ee-border)]">
                      {sortedCvs.map((cv) => (
                        <article key={cv.id} className="grid gap-4 py-4 lg:grid-cols-[minmax(0,1fr)_auto]">
                          <div className="min-w-0 space-y-2">
                            <p className="truncate text-sm font-bold uppercase tracking-[0.08em] text-[color:var(--s2ee-soft-foreground)]">
                              {cv.fileName}
                            </p>
                            <p className="text-[11px] uppercase tracking-[0.16em] text-[color:var(--s2ee-muted-foreground)]">
                              {cv.contentType} · {formatFileSize(cv.fileSizeBytes)}
                            </p>
                          </div>

                          <div className="flex flex-wrap gap-2">
                            <Button
                              className="rounded-none border-[var(--s2ee-border)] bg-[var(--s2ee-surface-soft)] px-4 uppercase tracking-[0.18em] text-[color:var(--s2ee-soft-foreground)] shadow-none hover:bg-white"
                              size="sm"
                              variant="outline"
                              onClick={() =>
                                navigate({
                                  params: { profileId: cv.id },
                                  to: "/student/profiles/$profileId",
                                })
                              }
                            >
                              Open CV
                              <ArrowRightIcon />
                            </Button>
                            <Button
                              className="rounded-none px-4 uppercase tracking-[0.18em]"
                              loading={deletingProfileId === cv.id}
                              size="sm"
                              variant="destructive-outline"
                              onClick={() => void removeCv(cv)}
                            >
                              Delete
                              <Trash2Icon />
                            </Button>
                          </div>
                        </article>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </section>
        ) : (
          <section className="max-w-3xl border bg-[var(--s2ee-surface)] p-5 sm:p-6 [border-color:var(--s2ee-border)]">
            <div className="space-y-2">
              <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-[color:var(--s2ee-muted-foreground)]">
                Settings
              </p>
              <h2 className="text-2xl font-black tracking-[-0.06em] text-[color:var(--s2ee-soft-foreground)]">
                Personal information
              </h2>
            </div>

            {studentState.kind === "loading" ? (
              <div className="mt-6 grid gap-3">
                <Skeleton className="h-12 rounded-none" />
                <Skeleton className="h-12 rounded-none" />
                <Skeleton className="h-12 rounded-none" />
                <Skeleton className="h-12 rounded-none" />
              </div>
            ) : (
              <form className="mt-6 grid gap-5" onSubmit={saveSettings}>
                <div className="grid gap-5 sm:grid-cols-2">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-[0.22em] text-[color:var(--s2ee-muted-foreground)]" htmlFor="student-settings-first-name">
                      First name
                    </label>
                    <Input
                      id="student-settings-first-name"
                      className="rounded-none border-[var(--s2ee-border)] bg-[var(--s2ee-surface)] shadow-none"
                      value={firstNameDraft}
                      onChange={(event) => setFirstNameDraft(event.currentTarget.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-[0.22em] text-[color:var(--s2ee-muted-foreground)]" htmlFor="student-settings-last-name">
                      Last name
                    </label>
                    <Input
                      id="student-settings-last-name"
                      className="rounded-none border-[var(--s2ee-border)] bg-[var(--s2ee-surface)] shadow-none"
                      value={lastNameDraft}
                      onChange={(event) => setLastNameDraft(event.currentTarget.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-[0.22em] text-[color:var(--s2ee-muted-foreground)]" htmlFor="student-settings-school">
                      School
                    </label>
                    <Input
                      id="student-settings-school"
                      className="rounded-none border-[var(--s2ee-border)] bg-[var(--s2ee-surface)] shadow-none"
                      value={institutionDraft}
                      onChange={(event) => setInstitutionDraft(event.currentTarget.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-[0.22em] text-[color:var(--s2ee-muted-foreground)]" htmlFor="student-settings-major">
                      Major
                    </label>
                    <Input
                      id="student-settings-major"
                      className="rounded-none border-[var(--s2ee-border)] bg-[var(--s2ee-surface)] shadow-none"
                      value={majorDraft}
                      onChange={(event) => setMajorDraft(event.currentTarget.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-[0.22em] text-[color:var(--s2ee-muted-foreground)]" htmlFor="student-settings-academic-year">
                      Academic year
                    </label>
                    <Input
                      id="student-settings-academic-year"
                      className="rounded-none border-[var(--s2ee-border)] bg-[var(--s2ee-surface)] shadow-none"
                      value={academicYearDraft}
                      onChange={(event) => setAcademicYearDraft(event.currentTarget.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-[0.22em] text-[color:var(--s2ee-muted-foreground)]" htmlFor="student-settings-phone-number">
                      Phone number
                    </label>
                    <Input
                      id="student-settings-phone-number"
                      className="rounded-none border-[var(--s2ee-border)] bg-[var(--s2ee-surface)] shadow-none"
                      value={phoneNumberDraft}
                      onChange={(event) => setPhoneNumberDraft(event.currentTarget.value)}
                    />
                  </div>
                </div>

                <div className="flex justify-end border-t pt-5 [border-color:var(--s2ee-border)]">
                  <Button className="rounded-none px-6 py-4 text-sm uppercase tracking-[0.2em]" loading={isSavingSettings} size="lg" type="submit">
                    Save settings
                  </Button>
                </div>
              </form>
            )}
          </section>
        )}
      </div>

      <StudentOnboardingDialog
        isSaving={isSavingOnboarding}
        mutationError={onboardingMutationError}
        onSubmit={submitOnboarding}
        open={onboardingRequired && !hasCompletedOnboarding}
        student={student}
      />
    </main>
  );
}
