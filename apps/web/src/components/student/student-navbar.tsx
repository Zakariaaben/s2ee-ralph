import type React from "react";
import { LogOutIcon } from "lucide-react";

import { AppIslandNavbar } from "@/components/app-island-navbar";

type StudentNavbarProps = {
  readonly isSigningOut: boolean;
  readonly onSignOut: () => void;
};

export function StudentNavbar({ isSigningOut, onSignOut }: StudentNavbarProps): React.ReactElement {
  return (
    <AppIslandNavbar
      action={
        <button
          className="inline-flex items-center gap-2 rounded-[8px] border border-[var(--s2ee-border)] bg-[var(--s2ee-surface)] px-4 py-2 text-sm font-bold text-[color:var(--s2ee-soft-foreground)] transition-colors hover:bg-white disabled:cursor-not-allowed disabled:opacity-70"
          disabled={isSigningOut}
          type="button"
          onClick={onSignOut}
        >
          Se deconnecter
          <LogOutIcon className="size-4" />
        </button>
      }
    />
  );
}
