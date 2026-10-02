import Link from "next/link";
import type { ReactNode } from "react";

export function AppShell({ children }: { children: ReactNode }) {
  return <>
    <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:bg-surface focus:p-4">Skip to content</a>
    <header className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-5 px-6 py-7 sm:px-10">
      <Link href="/" className="text-xl font-bold tracking-tight sm:text-2xl">Home Heat Planner</Link>
      <nav aria-label="Main navigation"><Link href="/cooling-plan" className="inline-flex min-h-11 items-center text-forest underline-offset-4 hover:underline">My Plan</Link></nav>
    </header>
    <main id="main-content" className="mx-auto max-w-7xl px-6 py-12 sm:px-10 sm:py-20">{children}</main>
  </>;
}
