import type React from "react";
import { LogOutIcon } from "lucide-react";

type StudentNavbarProps = {
  readonly isSigningOut: boolean;
  readonly onSignOut: () => void;
};

export function StudentNavbar({ isSigningOut, onSignOut }: StudentNavbarProps): React.ReactElement {
  return (
    <header className="border-b bg-[color:color-mix(in_srgb,var(--s2ee-surface-soft)_88%,black)] px-4 py-3 sm:px-6 [border-color:var(--s2ee-border)]">
      <nav className="mx-auto flex max-w-5xl items-center justify-between gap-4">
        <a className="flex items-center gap-3" href="/">
          <img alt="ETIC Club" className="h-8 w-auto" src="/etic.svg" />
          <span className="h-6 w-px bg-[var(--s2ee-border)]" />
          <img alt="S2EE" className="h-7 w-auto" src="/s2ee.svg" />
        </a>

        <button
          className="inline-flex items-center gap-2 rounded-[8px] border border-[var(--s2ee-border)] bg-[var(--s2ee-surface)] px-4 py-2 text-sm font-bold text-[color:var(--s2ee-soft-foreground)] transition-colors hover:bg-white disabled:cursor-not-allowed disabled:opacity-70"
          disabled={isSigningOut}
          type="button"
          onClick={onSignOut}
        >
          Se deconnecter
          <LogOutIcon className="size-4" />
        </button>
      </nav>
    </header>
  );
}
