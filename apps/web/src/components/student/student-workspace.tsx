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
  FileTextIcon,
  LogOutIcon,
  RefreshCwIcon,
  SettingsIcon,
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

  return "La mise a jour n'a pas pu etre effectuee. Reessayez.";
};

const readFileAsBase64 = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onerror = () => {
      reject(new Error("Impossible de lire le fichier selectionne."));
    };

    reader.onload = () => {
      if (typeof reader.result !== "string") {
        reject(new Error("Impossible de traiter le fichier selectionne."));
        return;
      }

      const base64 = reader.result.split(",", 2)[1];

      if (!base64) {
        reject(new Error("Le fichier selectionne ne contient pas de donnees utilisables."));
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
  const [isUploadingCv, setIsUploadingCv] = useState(false);
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
  const studentInstitutionsResult = useAtomValue(studentWorkspaceAtoms.studentInstitutions);
  const studentMajorsResult = useAtomValue(studentWorkspaceAtoms.studentMajors);
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
    "Vos informations n'ont pas pu etre chargees.",
  );
  const cvsState = toAsyncPanelState(cvsResult, "Votre liste de CV n'a pas pu etre chargee.");
  const student = studentState.kind === "success" ? studentState.value : null;
  const cvs = cvsState.kind === "success" ? cvsState.value : [];
  const studentInstitutions = AsyncResult.isSuccess(studentInstitutionsResult)
    ? studentInstitutionsResult.value
    : [];
  const studentMajors = AsyncResult.isSuccess(studentMajorsResult) ? studentMajorsResult.value : [];
  const sortedCvs = [...cvs].sort((left, right) => {
    const byFileName = left.fileName.localeCompare(right.fileName);
    if (byFileName !== 0) {
      return byFileName;
    }

    return left.id.localeCompare(right.id);
  });
  const onboardingRequired =
    studentState.kind === "success" && !hasStudentOnboardingProfile(student);
  const studentDisplayName =
    [student?.firstName, student?.lastName].filter(Boolean).join(" ").trim() || "Espace etudiant";

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
        setWorkspaceMessage("Informations enregistrees.");
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
      setWorkspaceError("Completez tous les champs avant d'enregistrer.");
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
        setWorkspaceMessage("Informations enregistrees.");
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
      setWorkspaceError("Attendez le chargement complet avant de reessayer.");
      return;
    }

    if (selectedFile == null) {
      setWorkspaceError("Choisissez un fichier avant de continuer.");
      return;
    }

    if (
      selectedFile.type !== "application/pdf" &&
      !selectedFile.name.toLowerCase().endsWith(".pdf")
    ) {
      setWorkspaceError("Seuls les fichiers PDF sont autorises.");
      return;
    }

    setWorkspaceError(null);
    setWorkspaceMessage(null);
    setIsUploadingCv(true);

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
        setWorkspaceMessage(`${selectedFile.name} ajoute.`);
      });
    } catch (error) {
      setWorkspaceError(formatMutationError(error));
    } finally {
      setIsUploadingCv(false);
    }
  };

  const removeCv = async (cv: CvProfile) => {
    const confirmed = window.confirm(`Supprimer ${cv.fileName} ?`);
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
      setWorkspaceMessage(`${cv.fileName} supprime.`);
    } catch (error) {
      setWorkspaceError(formatMutationError(error));
    } finally {
      setDeletingProfileId(null);
    }
  };

  return (
    <main className="min-h-[100dvh] bg-[var(--s2ee-canvas)] text-foreground">
      <header className="border-b bg-[color:color-mix(in_srgb,var(--s2ee-surface-soft)_88%,black)] px-5 py-3 sm:px-8 [border-color:var(--s2ee-border)]">
        <nav className="mx-auto flex max-w-[1500px] flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <a className="flex items-center gap-3" href="/">
            <img alt="ETIC Club" className="h-8 w-auto" src="/etic.svg" />
            <span className="h-6 w-px bg-[var(--s2ee-border)]" />
            <img alt="S2EE" className="h-7 w-auto" src="/s2ee.svg" />
          </a>
          <div className="flex flex-wrap gap-3">
            <Button
              className="rounded-[8px] border-[var(--s2ee-border)] bg-[var(--s2ee-surface)] px-4 text-[color:var(--s2ee-soft-foreground)] shadow-none hover:bg-white"
              variant="outline"
              onClick={refreshWorkspace}
            >
              Actualiser
              <RefreshCwIcon />
            </Button>
            <Button
              className="rounded-[8px] border-[var(--s2ee-border)] bg-[var(--s2ee-surface)] px-4 text-[color:var(--s2ee-soft-foreground)] shadow-none hover:bg-white"
              loading={isSigningOut}
              variant="outline"
              onClick={handleSignOut}
            >
              Se deconnecter
              <LogOutIcon />
            </Button>
          </div>
        </nav>
      </header>

      <div className="mx-auto max-w-[1500px] px-5 py-6 sm:px-8 sm:py-8">
        <div className="mb-6 space-y-2">
          <h1 className="text-4xl font-black leading-none text-[color:var(--s2ee-soft-foreground)] sm:text-5xl">
            {studentDisplayName}
          </h1>
        </div>

        {workspaceError ||
        workspaceMessage ||
        studentState.kind === "failure" ||
        cvsState.kind === "failure" ? (
          <div className="mb-6 grid gap-3">
            {workspaceError ? (
              <Alert variant="error">
                <CircleAlertIcon className="size-4" />
                <AlertTitle>Echec de mise a jour</AlertTitle>
                <AlertDescription>{workspaceError}</AlertDescription>
              </Alert>
            ) : null}
            {workspaceMessage ? (
              <Alert>
                <AlertTitle>Mise a jour</AlertTitle>
                <AlertDescription>{workspaceMessage}</AlertDescription>
              </Alert>
            ) : null}
            {studentState.kind === "failure" ? (
              <Alert variant="warning">
                <CircleAlertIcon className="size-4" />
                <AlertTitle>Informations indisponibles</AlertTitle>
                <AlertDescription>{studentState.message}</AlertDescription>
              </Alert>
            ) : null}
            {cvsState.kind === "failure" ? (
              <Alert variant="warning">
                <CircleAlertIcon className="size-4" />
                <AlertTitle>Liste des CV indisponible</AlertTitle>
                <AlertDescription>{cvsState.message}</AlertDescription>
              </Alert>
            ) : null}
          </div>
        ) : null}

        <div className="mb-6 flex gap-2 border-b pb-4 [border-color:var(--s2ee-border)]">
          {[
            { icon: FileTextIcon, id: "cvs", label: "CV" },
            { icon: SettingsIcon, id: "settings", label: "Informations" },
          ].map((tab) => (
            <button
              key={tab.id}
              className={[
                "inline-flex min-h-11 items-center gap-2 rounded-[8px] border px-4 py-2 text-sm font-bold transition-colors",
                activeTab === tab.id
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-[var(--s2ee-border)] bg-[var(--s2ee-surface-soft)] text-[color:var(--s2ee-soft-foreground)] hover:bg-white",
              ].join(" ")}
              type="button"
              onClick={() => setActiveTab(tab.id as StudentTab)}
            >
              <tab.icon className="size-4" />
              {tab.label}
            </button>
          ))}
        </div>

        {activeTab === "cvs" ? (
          <section className="grid gap-6 lg:grid-cols-[22rem_minmax(0,1fr)]">
            <div className="rounded-[8px] border bg-[var(--s2ee-surface-soft)] p-5 sm:p-6 [border-color:var(--s2ee-border)]">
              <div className="space-y-6">
                <div className="space-y-2">
                  <p className="text-xs font-bold text-primary">Ajout</p>
                  <h2 className="text-2xl font-black text-[color:var(--s2ee-soft-foreground)]">
                    Ajouter un CV
                  </h2>
                  <p className="text-sm leading-6 text-[color:var(--s2ee-muted-foreground)]">
                    Importez un PDF, puis ouvrez sa page de presentation pour obtenir le QR code.
                  </p>
                </div>

                <form className="grid gap-5" onSubmit={submitCvUpload}>
                  <div className="space-y-3">
                    <label
                      className="text-sm font-bold text-[color:var(--s2ee-soft-foreground)]"
                      htmlFor="student-cv-upload"
                    >
                      Fichier
                    </label>
                    <div className="rounded-[8px] border bg-[var(--s2ee-surface)] p-4 [border-color:var(--s2ee-border)]">
                      <Input
                        key={fileInputResetKey}
                        accept={acceptedCvFileTypes}
                        className="rounded-[8px] border-0 bg-transparent px-0 py-0 shadow-none before:shadow-none"
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
                      PDF uniquement.
                    </p>
                  </div>

                  {selectedFile ? (
                    <div className="rounded-[8px] border bg-[color:color-mix(in_srgb,var(--s2ee-surface-soft)_65%,white)] p-4 [border-color:var(--s2ee-border)]">
                      <p className="text-sm font-bold text-[color:var(--s2ee-soft-foreground)]">
                        {selectedFile.name}
                      </p>
                      <p className="mt-1 text-xs text-[color:var(--s2ee-muted-foreground)]">
                        {selectedFile.type || "application/octet-stream"} -{" "}
                        {formatFileSize(selectedFile.size)}
                      </p>
                    </div>
                  ) : null}

                  <Button
                    className="min-h-14 rounded-[8px] px-6 py-4 text-sm"
                    loading={isUploadingCv}
                    size="lg"
                    type="submit"
                  >
                    {isUploadingCv ? "Ajout en cours..." : "Ajouter le CV"}
                    <UploadIcon />
                  </Button>
                </form>
              </div>
            </div>

            <div className="rounded-[8px] border bg-[var(--s2ee-surface)] p-5 sm:p-6 [border-color:var(--s2ee-border)]">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                <div className="space-y-2">
                  <p className="text-xs font-bold text-primary">CV</p>
                  <h2 className="text-2xl font-black text-[color:var(--s2ee-soft-foreground)]">
                    Liste
                  </h2>
                </div>
                <p className="text-sm font-bold text-[color:var(--s2ee-muted-foreground)]">
                  {sortedCvs.length} fichier{sortedCvs.length === 1 ? "" : "s"}
                </p>
              </div>

              <div className="mt-6">
                {cvsState.kind === "loading" ? (
                  <div className="grid gap-3">
                    <Skeleton className="h-24 rounded-[8px]" />
                    <Skeleton className="h-24 rounded-[8px]" />
                  </div>
                ) : sortedCvs.length === 0 ? (
                  <div className="rounded-[8px] border bg-[var(--s2ee-surface-soft)] p-6 [border-color:var(--s2ee-border)]">
                    <div className="space-y-3">
                      <p className="text-lg font-black text-[color:var(--s2ee-soft-foreground)]">
                        Aucun CV
                      </p>
                      <p className="text-sm leading-6 text-[color:var(--s2ee-muted-foreground)]">
                        Ajoutez votre premier PDF pour generer un code de presentation.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="divide-y overflow-hidden rounded-[8px] border [border-color:var(--s2ee-border)] [divide-color:var(--s2ee-border)]">
                      {sortedCvs.map((cv) => (
                        <article
                          key={cv.id}
                          className="grid gap-4 bg-[var(--s2ee-surface-soft)] p-4 lg:grid-cols-[minmax(0,1fr)_auto]"
                        >
                          <div className="min-w-0 space-y-2">
                            <p className="truncate text-sm font-bold text-[color:var(--s2ee-soft-foreground)]">
                              {cv.fileName}
                            </p>
                            <p className="text-xs text-[color:var(--s2ee-muted-foreground)]">
                              {cv.contentType} - {formatFileSize(cv.fileSizeBytes)}
                            </p>
                          </div>

                          <div className="flex flex-wrap gap-2">
                            <Button
                              className="rounded-[8px] border-[var(--s2ee-border)] bg-[var(--s2ee-surface)] px-4 text-[color:var(--s2ee-soft-foreground)] shadow-none hover:bg-white"
                              size="sm"
                              variant="outline"
                              onClick={() =>
                                navigate({
                                  params: { profileId: cv.id },
                                  to: "/student/profiles/$profileId",
                                })
                              }
                            >
                              Ouvrir
                              <ArrowRightIcon />
                            </Button>
                            <Button
                              className="rounded-[8px] px-4"
                              loading={deletingProfileId === cv.id}
                              size="sm"
                              variant="destructive-outline"
                              onClick={() => void removeCv(cv)}
                            >
                              Supprimer
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
          <section className="mx-auto w-full max-w-4xl rounded-[8px] border bg-[var(--s2ee-surface)] p-5 sm:p-6 [border-color:var(--s2ee-border)]">
            <div className="space-y-2">
              <p className="text-xs font-bold text-primary">Informations</p>
              <h2 className="text-2xl font-black text-[color:var(--s2ee-soft-foreground)]">
                Informations personnelles
              </h2>
              <p className="max-w-2xl text-sm leading-6 text-[color:var(--s2ee-muted-foreground)]">
                Ces donnees accompagnent vos CV pendant les echanges avec les entreprises.
              </p>
            </div>

            {studentState.kind === "loading" ? (
              <div className="mt-6 grid gap-3">
                <Skeleton className="h-12 rounded-[8px]" />
                <Skeleton className="h-12 rounded-[8px]" />
                <Skeleton className="h-12 rounded-[8px]" />
                <Skeleton className="h-12 rounded-[8px]" />
              </div>
            ) : (
              <form className="mt-6 grid gap-5" onSubmit={saveSettings}>
                <div className="grid gap-5 sm:grid-cols-2">
                  <div className="space-y-2">
                    <label
                      className="text-sm font-bold text-[color:var(--s2ee-soft-foreground)]"
                      htmlFor="student-settings-first-name"
                    >
                      Prenom
                    </label>
                    <Input
                      id="student-settings-first-name"
                      className="rounded-[8px] border-[var(--s2ee-border)] bg-[var(--s2ee-surface-soft)] shadow-none"
                      value={firstNameDraft}
                      onChange={(event) => setFirstNameDraft(event.currentTarget.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <label
                      className="text-sm font-bold text-[color:var(--s2ee-soft-foreground)]"
                      htmlFor="student-settings-last-name"
                    >
                      Nom
                    </label>
                    <Input
                      id="student-settings-last-name"
                      className="rounded-[8px] border-[var(--s2ee-border)] bg-[var(--s2ee-surface-soft)] shadow-none"
                      value={lastNameDraft}
                      onChange={(event) => setLastNameDraft(event.currentTarget.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <label
                      className="text-sm font-bold text-[color:var(--s2ee-soft-foreground)]"
                      htmlFor="student-settings-school"
                    >
                      Etablissement
                    </label>
                    <Input
                      id="student-settings-school"
                      className="rounded-[8px] border-[var(--s2ee-border)] bg-[var(--s2ee-surface-soft)] shadow-none"
                      value={institutionDraft}
                      onChange={(event) => setInstitutionDraft(event.currentTarget.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <label
                      className="text-sm font-bold text-[color:var(--s2ee-soft-foreground)]"
                      htmlFor="student-settings-major"
                    >
                      Specialite
                    </label>
                    <Input
                      id="student-settings-major"
                      className="rounded-[8px] border-[var(--s2ee-border)] bg-[var(--s2ee-surface-soft)] shadow-none"
                      value={majorDraft}
                      onChange={(event) => setMajorDraft(event.currentTarget.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <label
                      className="text-sm font-bold text-[color:var(--s2ee-soft-foreground)]"
                      htmlFor="student-settings-academic-year"
                    >
                      Annee
                    </label>
                    <Input
                      id="student-settings-academic-year"
                      className="rounded-[8px] border-[var(--s2ee-border)] bg-[var(--s2ee-surface-soft)] shadow-none"
                      value={academicYearDraft}
                      onChange={(event) => setAcademicYearDraft(event.currentTarget.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <label
                      className="text-sm font-bold text-[color:var(--s2ee-soft-foreground)]"
                      htmlFor="student-settings-phone-number"
                    >
                      Telephone
                    </label>
                    <Input
                      id="student-settings-phone-number"
                      className="rounded-[8px] border-[var(--s2ee-border)] bg-[var(--s2ee-surface-soft)] shadow-none"
                      value={phoneNumberDraft}
                      onChange={(event) => setPhoneNumberDraft(event.currentTarget.value)}
                    />
                  </div>
                </div>

                <div className="flex justify-end border-t pt-5 [border-color:var(--s2ee-border)]">
                  <Button
                    className="rounded-[8px] px-6 py-4 text-sm"
                    loading={isSavingSettings}
                    size="lg"
                    type="submit"
                  >
                    Enregistrer
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
        studentInstitutions={studentInstitutions}
        studentMajors={studentMajors}
      />
    </main>
  );
}
