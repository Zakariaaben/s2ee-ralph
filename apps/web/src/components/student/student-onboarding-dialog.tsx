"use client";

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
import type { Student } from "@project/domain";
import { CircleAlertIcon } from "lucide-react";
import type React from "react";
import { useEffect, useState } from "react";

type StudentOnboardingPayload = {
  readonly academicYear: string;
  readonly firstName: string;
  readonly image: string | null;
  readonly institution: string;
  readonly lastName: string;
  readonly major: string;
  readonly phoneNumber: string;
};

type StudentOnboardingDialogProps = {
  readonly isSaving: boolean;
  readonly mutationError: string | null;
  readonly onSubmit: (payload: StudentOnboardingPayload) => Promise<void>;
  readonly open: boolean;
  readonly student: Student | null;
};

const readFileAsDataUrl = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onerror = () => {
      reject(new Error("Impossible de lire l'image selectionnee."));
    };

    reader.onload = () => {
      if (typeof reader.result !== "string") {
        reject(new Error("Impossible de traiter l'image selectionnee."));
        return;
      }

      resolve(reader.result);
    };

    reader.readAsDataURL(file);
  });

export function StudentOnboardingDialog(props: StudentOnboardingDialogProps): React.ReactElement {
  const [firstNameDraft, setFirstNameDraft] = useState("");
  const [lastNameDraft, setLastNameDraft] = useState("");
  const [phoneNumberDraft, setPhoneNumberDraft] = useState("");
  const [academicYearDraft, setAcademicYearDraft] = useState("");
  const [majorDraft, setMajorDraft] = useState("");
  const [institutionDraft, setInstitutionDraft] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);

  useEffect(() => {
    if (!props.open) {
      return;
    }

    setFirstNameDraft(props.student?.firstName ?? "");
    setLastNameDraft(props.student?.lastName ?? "");
    setPhoneNumberDraft(props.student?.phoneNumber ?? "");
    setAcademicYearDraft(props.student?.academicYear ?? "");
    setMajorDraft(props.student?.major ?? "");
    setInstitutionDraft(props.student?.institution ?? "");
    setImageFile(null);
    setLocalError(null);
  }, [props.open, props.student]);

  const submitOnboarding = async (event: React.FormEvent<HTMLFormElement>) => {
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
      setLocalError("Completez tous les champs obligatoires.");
      return;
    }

    setLocalError(null);

    try {
      const image = imageFile != null ? await readFileAsDataUrl(imageFile) : (props.student?.image ?? null);

      await props.onSubmit({
        firstName,
        lastName,
        phoneNumber,
        academicYear,
        major,
        institution,
        image,
      });
    } catch (error) {
      if (error instanceof Error && error.message.trim().length > 0) {
        setLocalError(error.message);
        return;
      }

      setLocalError("Impossible d'enregistrer le profil. Reessayez.");
    }
  };

  return (
    <Dialog onOpenChange={() => undefined} open={props.open}>
      <DialogPopup
        bottomStickOnMobile={false}
        className="max-w-5xl border bg-[var(--s2ee-surface)] p-0 font-mono [border-color:var(--s2ee-border)]"
        showCloseButton={false}
      >
        <DialogHeader className="border-b bg-[var(--s2ee-surface-soft)] px-5 py-5 sm:px-8 sm:py-6 [border-color:var(--s2ee-border)]">
          <DialogTitle className="text-2xl font-black tracking-[-0.06em] text-[color:var(--s2ee-soft-foreground)]">
            Completer votre profil
          </DialogTitle>
        </DialogHeader>

        <DialogPanel className="p-0" scrollFade={false}>
          <div className="grid gap-0 lg:grid-cols-[18rem_minmax(0,1fr)]">
            <section className="border-b bg-[var(--s2ee-surface-soft)] px-5 py-6 sm:px-8 lg:border-b-0 lg:border-r [border-color:var(--s2ee-border)]">
              <div className="space-y-6">
                <div className="space-y-2">
                  <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-[color:var(--s2ee-muted-foreground)]">
                    Profil
                  </p>
                  <p className="text-2xl font-black tracking-[-0.06em] text-primary">Obligatoire</p>
                </div>

                <div className="space-y-4 text-sm leading-7 text-[color:var(--s2ee-soft-foreground)]">
                  <p>Renseignez vos informations avant d'ajouter un CV.</p>
                </div>
              </div>
            </section>

            <section className="px-5 py-6 sm:px-8">
              <form className="grid gap-5" onSubmit={submitOnboarding}>
                <div className="grid gap-5 sm:grid-cols-2">
                  <div className="space-y-2">
                    <label
                      className="text-[10px] font-bold uppercase tracking-[0.22em] text-[color:var(--s2ee-muted-foreground)]"
                      htmlFor="student-onboarding-first-name"
                    >
                      Prenom
                    </label>
                    <Input
                      id="student-onboarding-first-name"
                      className="rounded-none border-[var(--s2ee-border)] bg-[var(--s2ee-surface)] shadow-none"
                      name="firstName"
                      placeholder="Prenom"
                      value={firstNameDraft}
                      onChange={(event) => {
                        const { value } = event.currentTarget;
                        setFirstNameDraft(value);
                      }}
                    />
                  </div>

                  <div className="space-y-2">
                    <label
                      className="text-[10px] font-bold uppercase tracking-[0.22em] text-[color:var(--s2ee-muted-foreground)]"
                      htmlFor="student-onboarding-last-name"
                    >
                      Nom
                    </label>
                    <Input
                      id="student-onboarding-last-name"
                      className="rounded-none border-[var(--s2ee-border)] bg-[var(--s2ee-surface)] shadow-none"
                      name="lastName"
                      placeholder="Nom"
                      value={lastNameDraft}
                      onChange={(event) => {
                        const { value } = event.currentTarget;
                        setLastNameDraft(value);
                      }}
                    />
                  </div>

                  <div className="space-y-2">
                    <label
                      className="text-[10px] font-bold uppercase tracking-[0.22em] text-[color:var(--s2ee-muted-foreground)]"
                      htmlFor="student-onboarding-phone-number"
                    >
                      Telephone
                    </label>
                    <Input
                      id="student-onboarding-phone-number"
                      className="rounded-none border-[var(--s2ee-border)] bg-[var(--s2ee-surface)] shadow-none"
                      name="phoneNumber"
                      placeholder="+213 ..."
                      value={phoneNumberDraft}
                      onChange={(event) => {
                        const { value } = event.currentTarget;
                        setPhoneNumberDraft(value);
                      }}
                    />
                  </div>

                  <div className="space-y-2">
                    <label
                      className="text-[10px] font-bold uppercase tracking-[0.22em] text-[color:var(--s2ee-muted-foreground)]"
                      htmlFor="student-onboarding-academic-year"
                    >
                      Annee
                    </label>
                    <Input
                      id="student-onboarding-academic-year"
                      className="rounded-none border-[var(--s2ee-border)] bg-[var(--s2ee-surface)] shadow-none"
                      name="academicYear"
                      placeholder="Annee"
                      value={academicYearDraft}
                      onChange={(event) => {
                        const { value } = event.currentTarget;
                        setAcademicYearDraft(value);
                      }}
                    />
                  </div>

                  <div className="space-y-2">
                    <label
                      className="text-[10px] font-bold uppercase tracking-[0.22em] text-[color:var(--s2ee-muted-foreground)]"
                      htmlFor="student-onboarding-major"
                    >
                      Specialite
                    </label>
                    <Input
                      id="student-onboarding-major"
                      className="rounded-none border-[var(--s2ee-border)] bg-[var(--s2ee-surface)] shadow-none"
                      name="major"
                      placeholder="Specialite"
                      value={majorDraft}
                      onChange={(event) => {
                        const { value } = event.currentTarget;
                        setMajorDraft(value);
                      }}
                    />
                  </div>

                  <div className="space-y-2">
                    <label
                      className="text-[10px] font-bold uppercase tracking-[0.22em] text-[color:var(--s2ee-muted-foreground)]"
                      htmlFor="student-onboarding-institution"
                    >
                      Institution
                    </label>
                    <Input
                      id="student-onboarding-institution"
                      className="rounded-none border-[var(--s2ee-border)] bg-[var(--s2ee-surface)] shadow-none"
                      name="institution"
                      placeholder="Institution"
                      value={institutionDraft}
                      onChange={(event) => {
                        const { value } = event.currentTarget;
                        setInstitutionDraft(value);
                      }}
                    />
                  </div>
                </div>

                <div className="space-y-2 border-t pt-5 [border-color:var(--s2ee-border)]">
                  <label
                    className="text-[10px] font-bold uppercase tracking-[0.22em] text-[color:var(--s2ee-muted-foreground)]"
                    htmlFor="student-onboarding-image"
                  >
                    Photo de profil
                  </label>
                  <div className="border bg-[var(--s2ee-surface-soft)] p-4 [border-color:var(--s2ee-border)]">
                    <Input
                      accept="image/*"
                      className="rounded-none border-0 bg-transparent px-0 py-0 shadow-none before:shadow-none"
                      id="student-onboarding-image"
                      nativeInput
                      type="file"
                      unstyled
                      onChange={(event) => {
                        const { files } = event.currentTarget;
                        const file = files?.[0] ?? null;
                        setImageFile(file);
                      }}
                    />
                    <p className="mt-3 text-[11px] uppercase tracking-[0.16em] text-[color:var(--s2ee-muted-foreground)]">
                      Optionnel. Reutilisee dans l'apercu candidat.
                    </p>
                  </div>
                </div>

                {localError || props.mutationError ? (
                  <Alert variant="error">
                    <CircleAlertIcon className="size-4" />
                    <AlertTitle>Profil non enregistre</AlertTitle>
                    <AlertDescription>{localError ?? props.mutationError}</AlertDescription>
                  </Alert>
                ) : null}

                <div className="flex justify-end border-t pt-5 [border-color:var(--s2ee-border)]">
                  <Button className="rounded-none px-6 py-4 text-sm uppercase tracking-[0.2em]" loading={props.isSaving} size="lg" type="submit">
                    Enregistrer et continuer
                  </Button>
                </div>
              </form>
            </section>
          </div>
        </DialogPanel>
      </DialogPopup>
    </Dialog>
  );
}
