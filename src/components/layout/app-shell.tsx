import type { ReactNode } from "react";
import { JourneyHeader } from "./journey-header";

export function AppShell({ children }: { children: ReactNode }) {
  return <>
    <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:bg-surface focus:p-4">Skip to content</a>
    <div className="app-shell-header mx-auto max-w-7xl px-6 sm:px-10"><JourneyHeader /></div>
    <main id="main-content" className="app-shell-main mx-auto max-w-7xl px-6 py-12 sm:px-10 sm:py-20">{children}</main>
  </>;
}
