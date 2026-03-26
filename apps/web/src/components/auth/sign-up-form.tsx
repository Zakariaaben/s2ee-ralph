"use client";

import { Input } from "@project/ui/components/input";
import { useNavigate } from "@tanstack/react-router";
import type React from "react";
import { useState } from "react";

import { deriveStudentAccountName } from "@/lib/auth-account-name";
import { authClient } from "@/lib/auth-client";
import { getRoleHomePath } from "@/lib/auth-routing";
import { getSessionRole } from "@/lib/route-auth";

type SignUpState = {
  readonly email: string;
  readonly password: string;
};

export function SignUpForm(): React.ReactElement {
  const navigate = useNavigate();
  const [signUpState, setSignUpState] = useState<SignUpState>({
    email: "",
    password: "",
  });
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

  const handleSignUp = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSignUpError(null);
    setIsSigningUp(true);

    try {
      const email = signUpState.email.trim();
      const result = await authClient.signUp.email({
        email,
        name: deriveStudentAccountName(email),
        password: signUpState.password,
      });

      if (result.error) {
        setSignUpError(result.error.message ?? "Impossible de creer le compte etudiant.");
        return;
      }

      setSignUpError(await completeAuthFlow());
    } finally {
      setIsSigningUp(false);
    }
  };

  return (
    <div className="space-y-12 font-mono">
      <header className="space-y-2">
        <div className="flex items-center gap-2">
          <span className="size-2 rounded-full bg-primary shadow-[0_0_0_4px_color-mix(in_srgb,var(--color-primary)_10%,transparent)]" />
          <h2 className="text-2xl font-black uppercase tracking-[-0.05em] text-[color:var(--s2ee-soft-foreground)] sm:text-3xl">
            Creer un compte etudiant
          </h2>
        </div>
        <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-primary">
          Inscription
        </p>
      </header>

      <div className="border-l-2 pl-4 text-sm leading-7 text-[color:var(--s2ee-soft-foreground)] [border-color:var(--color-primary)]">
        La creation de compte est reservee aux etudiants.
      </div>

      <form className="space-y-8" onSubmit={handleSignUp}>
        <div className="space-y-6">
          <div className="space-y-2">
            <label className="text-[10px] font-bold uppercase tracking-[0.22em] text-[color:var(--s2ee-muted-foreground)]" htmlFor="sign-up-email">
              Email
            </label>
            <Input
              id="sign-up-email"
              autoComplete="email"
              inputMode="email"
              className="rounded-none border-0 border-b px-0 py-3 shadow-none focus-visible:ring-0 [border-color:var(--s2ee-border)]"
              nativeInput
              unstyled
              placeholder="student@esi.dz"
              type="email"
              value={signUpState.email}
              onChange={(event) => {
                const { value } = event.currentTarget;
                setSignUpState((current) => ({ ...current, email: value }));
              }}
            />
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-bold uppercase tracking-[0.22em] text-[color:var(--s2ee-muted-foreground)]" htmlFor="sign-up-password">
              Mot de passe
            </label>
            <Input
              id="sign-up-password"
              autoComplete="new-password"
              className="rounded-none border-0 border-b px-0 py-3 shadow-none focus-visible:ring-0 [border-color:var(--s2ee-border)]"
              nativeInput
              unstyled
              placeholder="Choisissez un mot de passe"
              type="password"
              value={signUpState.password}
              onChange={(event) => {
                const { value } = event.currentTarget;
                setSignUpState((current) => ({ ...current, password: value }));
              }}
            />
          </div>
        </div>

        {signUpError ? (
          <div className="rounded-xl border bg-[var(--s2ee-danger-surface)] px-3 py-2 text-sm text-[color:var(--s2ee-danger-foreground)] [border-color:var(--s2ee-danger-border)]">
            {signUpError}
          </div>
        ) : null}

        <button
          className="flex min-h-16 w-full items-center justify-between bg-primary px-6 py-4 text-sm font-bold uppercase tracking-[0.22em] text-primary-foreground transition-all duration-200 ease-[cubic-bezier(0.32,0.72,0,1)] hover:brightness-105 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-70"
          disabled={isSigningUp}
          type="submit"
        >
          <span>{isSigningUp ? "Creation..." : "Creer un compte etudiant"}</span>
          <span aria-hidden="true" className="text-base leading-none">
            {"->"}
          </span>
        </button>
      </form>

      <div className="flex flex-wrap gap-x-5 gap-y-2 border-t pt-5 text-[11px] uppercase tracking-[0.22em] text-[color:var(--s2ee-muted-foreground)] [border-color:var(--s2ee-border)]">
        <a className="transition-colors hover:text-foreground" href="/auth/sign-in">
          Se connecter
        </a>
        <a className="transition-colors hover:text-foreground" href="/map">
          Plan du salon
        </a>
        <a className="transition-colors hover:text-foreground" href="/">
          Accueil
        </a>
      </div>
    </div>
  );
}
