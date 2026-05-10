"use client";

import { Input } from "@project/ui/components/input";
import { useNavigate } from "@tanstack/react-router";
import { ArrowRightIcon, UserPlusIcon } from "lucide-react";
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
    <div className="s2ee-auth-narrow space-y-9">
      <header className="space-y-4">
        <div className="space-y-3">
          <h2 className="text-4xl font-black leading-none text-[color:var(--s2ee-soft-foreground)]">
            Connexion
          </h2>
        </div>
      </header>

      <form className="space-y-7" onSubmit={handleSignIn}>
        <div className="space-y-6">
          <div className="space-y-2">
            <label
              className="text-sm font-bold text-[color:var(--s2ee-soft-foreground)]"
              htmlFor="sign-in-email"
            >
              Email
            </label>
            <Input
              id="sign-in-email"
              autoComplete="email"
              inputMode="email"
              className="rounded-[8px] border-[var(--s2ee-border)] bg-[var(--s2ee-surface-soft)] shadow-none"
              nativeInput
              placeholder="student@esi.dz"
              size="lg"
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
              <label
                className="text-sm font-bold text-[color:var(--s2ee-soft-foreground)]"
                htmlFor="sign-in-password"
              >
                Mot de passe
              </label>
            </div>
            <Input
              id="sign-in-password"
              autoComplete="current-password"
              className="rounded-[8px] border-[var(--s2ee-border)] bg-[var(--s2ee-surface-soft)] shadow-none"
              nativeInput
              placeholder="Mot de passe"
              size="lg"
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
          <div className="rounded-[8px] border bg-[var(--s2ee-danger-surface)] px-4 py-3 text-sm leading-6 text-[color:var(--s2ee-danger-foreground)] [border-color:var(--s2ee-danger-border)]">
            {signInError}
          </div>
        ) : null}

        <div className="space-y-3">
          <button
            className="s2ee-command flex min-h-14 w-full items-center justify-center gap-3 rounded-[8px] bg-primary px-6 py-4 text-sm text-primary-foreground hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-70"
            disabled={isSigningIn}
            type="submit"
          >
            <span>{isSigningIn ? "Connexion..." : "Se connecter"}</span>
            <ArrowRightIcon className="size-4" />
          </button>

          <a
            className="s2ee-command inline-flex min-h-13 w-full items-center justify-center gap-3 rounded-[8px] border bg-[var(--s2ee-surface-soft)] px-6 py-4 text-center text-xs text-[color:var(--s2ee-soft-foreground)] hover:bg-white [border-color:color-mix(in_srgb,var(--s2ee-border)_70%,transparent)]"
            href="/auth/sign-up"
          >
            <UserPlusIcon className="size-4" />
            Creer un compte etudiant
          </a>
        </div>
      </form>
    </div>
  );
}
