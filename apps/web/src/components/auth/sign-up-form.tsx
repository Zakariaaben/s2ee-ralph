"use client";

import { useAtomSet } from "@effect/atom-react";
import { Checkbox } from "@project/ui/components/checkbox";
import { Input } from "@project/ui/components/input";
import { useNavigate } from "@tanstack/react-router";
import { ArrowRightIcon, LogInIcon } from "lucide-react";
import type React from "react";
import { useState } from "react";

import { deriveStudentAccountName } from "@/lib/auth-account-name";
import { authClient } from "@/lib/auth-client";
import { getRoleHomePath } from "@/lib/auth-routing";
import { getSessionRole } from "@/lib/route-auth";
import { studentWorkspaceAtoms, studentWorkspaceReactivity } from "@/lib/student-atoms";

type SignUpState = {
  readonly academicYear: string;
  readonly email: string;
  readonly firstName: string;
  readonly institution: string;
  readonly lastName: string;
  readonly major: string;
  readonly password: string;
  readonly phoneNumber: string;
};

const initialSignUpState: SignUpState = {
  academicYear: "",
  email: "",
  firstName: "",
  institution: "",
  lastName: "",
  major: "",
  password: "",
  phoneNumber: "",
};

const trimSignUpState = (state: SignUpState): SignUpState => ({
  academicYear: state.academicYear.trim(),
  email: state.email.trim(),
  firstName: state.firstName.trim(),
  institution: state.institution.trim(),
  lastName: state.lastName.trim(),
  major: state.major.trim(),
  password: state.password,
  phoneNumber: state.phoneNumber.trim(),
});

const validateSignUpState = (state: SignUpState): string | null => {
  if (
    state.email.length === 0 ||
    state.password.length === 0 ||
    state.firstName.length === 0 ||
    state.lastName.length === 0 ||
    state.phoneNumber.length === 0 ||
    state.academicYear.length === 0 ||
    state.major.length === 0 ||
    state.institution.length === 0
  ) {
    return "Completez tous les champs avant de creer le compte.";
  }

  const academicYearNumber = Number(state.academicYear);

  if (!Number.isInteger(academicYearNumber) || academicYearNumber < 1 || academicYearNumber > 7) {
    return "L'annee doit etre un numero entre 1 et 7.";
  }

  return null;
};

export function SignUpForm(): React.ReactElement {
  const navigate = useNavigate();
  const saveStudent = useAtomSet(studentWorkspaceAtoms.upsertStudentOnboarding, {
    mode: "promise",
  });
  const [signUpState, setSignUpState] = useState<SignUpState>(initialSignUpState);
  const [hasAcceptedDataConsent, setHasAcceptedDataConsent] = useState(false);
  const [signUpError, setSignUpError] = useState<string | null>(null);
  const [isSigningUp, setIsSigningUp] = useState(false);

  const completeAuthFlow = async (): Promise<string | null> => {
    const currentSession = await authClient.getSession();

    if (currentSession.error) {
      return currentSession.error.message ?? "Compte cree, mais session introuvable.";
    }

    const role = getSessionRole(currentSession.data);

    if (role == null) {
      return "Compte cree, mais le role n'a pas pu etre determine.";
    }

    await navigate({
      replace: true,
      to: getRoleHomePath(role),
    });

    return null;
  };

  const updateSignUpState =
    (field: keyof SignUpState) => (event: React.ChangeEvent<HTMLInputElement>) => {
      const { value } = event.currentTarget;
      setSignUpState((current) => ({ ...current, [field]: value }));
    };

  const handleSignUp = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSignUpError(null);

    const payload = trimSignUpState(signUpState);
    const validationError = validateSignUpState(payload);

    if (validationError != null) {
      setSignUpError(validationError);
      return;
    }

    if (!hasAcceptedDataConsent) {
      setSignUpError("Vous devez accepter l'utilisation de vos donnees pour creer le compte.");
      return;
    }

    setIsSigningUp(true);

    try {
      const result = await authClient.signUp.email({
        email: payload.email,
        name: deriveStudentAccountName(payload.email),
        password: payload.password,
      });

      if (result.error) {
        setSignUpError(result.error.message ?? "Impossible de creer le compte etudiant.");
        return;
      }

      await saveStudent({
        payload: {
          academicYear: payload.academicYear,
          firstName: payload.firstName,
          image: null,
          institution: payload.institution,
          lastName: payload.lastName,
          major: payload.major,
          phoneNumber: payload.phoneNumber,
        },
        reactivityKeys: {
          currentStudent: studentWorkspaceReactivity.currentStudent,
        },
      });

      setSignUpError(await completeAuthFlow());
    } catch (error) {
      setSignUpError(
        error instanceof Error && error.message.trim().length > 0
          ? error.message
          : "Le compte a ete cree, mais le profil etudiant n'a pas pu etre enregistre.",
      );
    } finally {
      setIsSigningUp(false);
    }
  };

  return (
    <div className="space-y-9">
      <header className="space-y-4">
        <div className="space-y-3">
          <h2 className="text-4xl font-black leading-none text-[color:var(--s2ee-soft-foreground)]">
            Creer un compte
          </h2>
        </div>
      </header>

      <form className="space-y-7" onSubmit={handleSignUp}>
        <div className="grid gap-5 sm:grid-cols-2">
          <div className="space-y-2 sm:col-span-2">
            <label
              className="text-sm font-bold text-[color:var(--s2ee-soft-foreground)]"
              htmlFor="sign-up-email"
            >
              Email
            </label>
            <Input
              id="sign-up-email"
              autoComplete="email"
              inputMode="email"
              className="rounded-[8px] border-[var(--s2ee-border)] bg-[var(--s2ee-surface-soft)] shadow-none"
              nativeInput
              placeholder="student@esi.dz"
              size="lg"
              type="email"
              value={signUpState.email}
              onChange={updateSignUpState("email")}
            />
          </div>

          <div className="space-y-2 sm:col-span-2">
            <label
              className="text-sm font-bold text-[color:var(--s2ee-soft-foreground)]"
              htmlFor="sign-up-password"
            >
              Mot de passe
            </label>
            <Input
              id="sign-up-password"
              autoComplete="new-password"
              className="rounded-[8px] border-[var(--s2ee-border)] bg-[var(--s2ee-surface-soft)] shadow-none"
              nativeInput
              placeholder="Choisissez un mot de passe"
              size="lg"
              type="password"
              value={signUpState.password}
              onChange={updateSignUpState("password")}
            />
          </div>

          <div className="space-y-2">
            <label
              className="text-sm font-bold text-[color:var(--s2ee-soft-foreground)]"
              htmlFor="sign-up-first-name"
            >
              Prenom
            </label>
            <Input
              id="sign-up-first-name"
              autoComplete="given-name"
              className="rounded-[8px] border-[var(--s2ee-border)] bg-[var(--s2ee-surface-soft)] shadow-none"
              nativeInput
              placeholder="Prenom"
              size="lg"
              value={signUpState.firstName}
              onChange={updateSignUpState("firstName")}
            />
          </div>

          <div className="space-y-2">
            <label
              className="text-sm font-bold text-[color:var(--s2ee-soft-foreground)]"
              htmlFor="sign-up-last-name"
            >
              Nom
            </label>
            <Input
              id="sign-up-last-name"
              autoComplete="family-name"
              className="rounded-[8px] border-[var(--s2ee-border)] bg-[var(--s2ee-surface-soft)] shadow-none"
              nativeInput
              placeholder="Nom"
              size="lg"
              value={signUpState.lastName}
              onChange={updateSignUpState("lastName")}
            />
          </div>

          <div className="space-y-2">
            <label
              className="text-sm font-bold text-[color:var(--s2ee-soft-foreground)]"
              htmlFor="sign-up-phone"
            >
              Telephone
            </label>
            <Input
              id="sign-up-phone"
              autoComplete="tel"
              className="rounded-[8px] border-[var(--s2ee-border)] bg-[var(--s2ee-surface-soft)] shadow-none"
              nativeInput
              placeholder="+213 ..."
              size="lg"
              value={signUpState.phoneNumber}
              onChange={updateSignUpState("phoneNumber")}
            />
          </div>

          <div className="space-y-2">
            <label
              className="text-sm font-bold text-[color:var(--s2ee-soft-foreground)]"
              htmlFor="sign-up-year"
            >
              Annee
            </label>
            <Input
              id="sign-up-year"
              className="rounded-[8px] border-[var(--s2ee-border)] bg-[var(--s2ee-surface-soft)] shadow-none"
              inputMode="numeric"
              max={7}
              min={1}
              nativeInput
              placeholder="1 a 7"
              size="lg"
              type="number"
              value={signUpState.academicYear}
              onChange={updateSignUpState("academicYear")}
            />
          </div>

          <div className="space-y-2">
            <label
              className="text-sm font-bold text-[color:var(--s2ee-soft-foreground)]"
              htmlFor="sign-up-major"
            >
              Specialite
            </label>
            <Input
              id="sign-up-major"
              className="rounded-[8px] border-[var(--s2ee-border)] bg-[var(--s2ee-surface-soft)] shadow-none"
              nativeInput
              placeholder="Specialite"
              size="lg"
              value={signUpState.major}
              onChange={updateSignUpState("major")}
            />
          </div>

          <div className="space-y-2">
            <label
              className="text-sm font-bold text-[color:var(--s2ee-soft-foreground)]"
              htmlFor="sign-up-institution"
            >
              Etablissement
            </label>
            <Input
              id="sign-up-institution"
              className="rounded-[8px] border-[var(--s2ee-border)] bg-[var(--s2ee-surface-soft)] shadow-none"
              nativeInput
              placeholder="Etablissement"
              size="lg"
              value={signUpState.institution}
              onChange={updateSignUpState("institution")}
            />
          </div>
        </div>

        <label
          className="flex gap-3 rounded-[8px] border bg-[var(--s2ee-surface-soft)] p-4 text-sm leading-6 text-[color:var(--s2ee-muted-foreground)] [border-color:var(--s2ee-border)]"
          htmlFor="sign-up-data-consent"
        >
          <Checkbox
            checked={hasAcceptedDataConsent}
            className="mt-0.5 border-[var(--s2ee-border)] bg-[var(--s2ee-surface)]"
            id="sign-up-data-consent"
            onCheckedChange={(checked) => setHasAcceptedDataConsent(Boolean(checked))}
          />
          <span>
            En vous inscrivant, vous consentez a ce que vos donnees soient utilisees par ETIC Club,
            Natixis Algerie, ESI Alger et toute entreprise qui scanne votre QR code.
          </span>
        </label>

        {signUpError ? (
          <div className="rounded-[8px] border bg-[var(--s2ee-danger-surface)] px-4 py-3 text-sm leading-6 text-[color:var(--s2ee-danger-foreground)] [border-color:var(--s2ee-danger-border)]">
            {signUpError}
          </div>
        ) : null}

        <button
          className="s2ee-command flex min-h-14 w-full items-center justify-center gap-3 rounded-[8px] bg-primary px-6 py-4 text-sm text-primary-foreground hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-70"
          disabled={isSigningUp}
          type="submit"
        >
          <span>{isSigningUp ? "Creation..." : "Creer un compte etudiant"}</span>
          <ArrowRightIcon className="size-4" />
        </button>
      </form>

      <div className="border-t pt-5 [border-color:var(--s2ee-border)]">
        <a
          className="s2ee-command inline-flex min-h-13 w-full items-center justify-center gap-3 rounded-[8px] border bg-[var(--s2ee-surface-soft)] px-6 py-4 text-center text-xs text-[color:var(--s2ee-soft-foreground)] hover:bg-white [border-color:color-mix(in_srgb,var(--s2ee-border)_70%,transparent)]"
          href="/auth/sign-in"
        >
          <LogInIcon className="size-4" />
          Se connecter
        </a>
      </div>
    </div>
  );
}
