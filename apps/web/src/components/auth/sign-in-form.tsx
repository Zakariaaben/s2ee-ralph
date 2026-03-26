"use client";

import { Input } from "@project/ui/components/input";
import { useNavigate } from "@tanstack/react-router";
import type React from "react";
import { useState } from "react";
import { authClient } from "@/lib/auth-client";
import { getRoleHomePath } from "@/lib/auth-routing";
import { getSessionRole } from "@/lib/route-auth";

type SignInState = {
  readonly email: string;
  readonly password: string;
};

export function SignInForm(): React.ReactElement {
  const navigate = useNavigate();
  const [signInState, setSignInState] = useState<SignInState>({ email: "", password: "" });
  const [signInError, setSignInError] = useState<string | null>(null);
  const [isSigningIn, setIsSigningIn] = useState(false);

  const completeAuthFlow = async (): Promise<string | null> => {
    const currentSession = await authClient.getSession();

    if (currentSession.error) {
      return currentSession.error.message ?? "Connexion reussie, mais session introuvable.";
    }

    const role = getSessionRole(currentSession.data);

    if (role == null) {
      return "Connexion reussie, mais le role n'a pas pu etre determine.";
    }

    await navigate({
      replace: true,
      to: getRoleHomePath(role),
    });

    return null;
  };

  const handleSignIn = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSignInError(null);
    setIsSigningIn(true);

    try {
      const result = await authClient.signIn.email({
        email: signInState.email,
        password: signInState.password,
      });

      if (result.error) {
        setSignInError(result.error.message ?? "Impossible de se connecter avec ces identifiants.");
        return;
      }

      setSignInError(await completeAuthFlow());
    } finally {
      setIsSigningIn(false);
    }
  };

  return (
    <div className="space-y-12 font-mono">
      <header className="space-y-2">
        <div className="flex items-center gap-2">
          <span className="size-2 rounded-full bg-primary shadow-[0_0_0_4px_color-mix(in_srgb,var(--color-primary)_10%,transparent)]" />
          <h2 className="text-2xl font-black uppercase tracking-[-0.05em] text-[color:var(--s2ee-soft-foreground)] sm:text-3xl">
            Connexion
          </h2>
        </div>
        <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-primary">
          Acceder a votre espace
        </p>
      </header>

      <form className="space-y-8" onSubmit={handleSignIn}>
        <div className="space-y-6">
          <div className="space-y-2">
            <label className="text-[10px] font-bold uppercase tracking-[0.22em] text-[color:var(--s2ee-muted-foreground)]" htmlFor="sign-in-email">
              Email
            </label>
            <Input
              id="sign-in-email"
              autoComplete="email"
              inputMode="email"
              className="rounded-none border-0 border-b px-0 py-3 shadow-none focus-visible:ring-0 [border-color:var(--s2ee-border)]"
              nativeInput
              unstyled
              placeholder="student@esi.dz"
              type="email"
              value={signInState.email}
              onChange={(event) => {
                const { value } = event.currentTarget;
                setSignInState((current) => ({ ...current, email: value }));
              }}
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between gap-4">
              <label className="text-[10px] font-bold uppercase tracking-[0.22em] text-[color:var(--s2ee-muted-foreground)]" htmlFor="sign-in-password">
                Mot de passe
              </label>
            </div>
            <Input
              id="sign-in-password"
              autoComplete="current-password"
              className="rounded-none border-0 border-b px-0 py-3 shadow-none focus-visible:ring-0 [border-color:var(--s2ee-border)]"
              nativeInput
              unstyled
              placeholder="••••••••••••"
              type="password"
              value={signInState.password}
              onChange={(event) => {
                const { value } = event.currentTarget;
                setSignInState((current) => ({ ...current, password: value }));
              }}
            />
          </div>
        </div>

        {signInError ? (
          <div className="rounded-xl border bg-[var(--s2ee-danger-surface)] px-3 py-2 text-sm text-[color:var(--s2ee-danger-foreground)] [border-color:var(--s2ee-danger-border)]">
            {signInError}
          </div>
        ) : null}

        <div className="space-y-5">
          <button
            className="flex min-h-16 w-full items-center justify-between bg-primary px-6 py-4 text-sm font-bold uppercase tracking-[0.22em] text-primary-foreground transition-all duration-200 ease-[cubic-bezier(0.32,0.72,0,1)] hover:brightness-105 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-70"
            disabled={isSigningIn}
            type="submit"
          >
            <span>{isSigningIn ? "Connexion..." : "Se connecter"}</span>
            <span aria-hidden="true" className="text-base leading-none">
              {"->"}
            </span>
          </button>

          <a
            className="inline-flex min-h-14 w-full items-center justify-center border bg-[var(--s2ee-surface-soft)] px-6 py-4 text-center text-xs font-bold uppercase tracking-[0.18em] text-[color:var(--s2ee-soft-foreground)] transition-colors duration-200 ease-[cubic-bezier(0.32,0.72,0,1)] hover:bg-[color:color-mix(in_srgb,var(--s2ee-surface-soft)_75%,white)] active:scale-[0.98] [border-color:color-mix(in_srgb,var(--s2ee-border)_70%,transparent)]"
            href="/auth/sign-up"
          >
            Creer un compte etudiant
          </a>
        </div>
      </form>
    </div>
  );
}
