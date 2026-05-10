import type React from "react";

type AppIslandNavbarProps = {
  readonly action: React.ReactNode;
};

export function AppIslandNavbar({ action }: AppIslandNavbarProps): React.ReactElement {
  return (
    <header className="sticky top-4 z-50 w-full px-4 pt-4 sm:top-5 sm:px-6 sm:pt-5">
      <nav className="mx-auto flex max-w-5xl items-center justify-between gap-4 rounded-[8px] border bg-[color:color-mix(in_srgb,var(--s2ee-surface-soft)_88%,black)] px-4 py-3 shadow-[0_18px_50px_color-mix(in_srgb,black_20%,transparent)] sm:px-5 [border-color:var(--s2ee-border)]">
        <a className="flex items-center gap-3" href="/">
          <img alt="ETIC Club" className="h-8 w-auto" src="/etic.svg" />
          <span className="h-6 w-px bg-[var(--s2ee-border)]" />
          <img alt="S2EE" className="h-7 w-auto" src="/s2ee.svg" />
        </a>

        {action}
      </nav>
    </header>
  );
}
