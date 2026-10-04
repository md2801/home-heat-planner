"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useRef, useSyncExternalStore } from "react";
import { accountStore } from "@/features/account/account-store";
import styles from "./journey-header.module.css";

export function JourneyHeader() {
  const pathname = usePathname();
  const account = useSyncExternalStore(accountStore.subscribe, accountStore.getSnapshot, accountStore.getServerSnapshot);
  const planActive = pathname === "/cooling-plan";
  const exploreActive = pathname === "/explore" || pathname.startsWith("/explore/") || pathname === "/knowledge-base";
  const exploreMenu = useRef<HTMLDetailsElement>(null);
  const closeExplore = () => { if (exploreMenu.current) exploreMenu.current.open = false; };
  return <header className={styles.header}>
    <Link href="/" className={styles.brand} aria-label="Home Heat Planner home">
      <svg viewBox="0 0 32 32" fill="none" aria-hidden="true"><rect x="1" y="1" width="30" height="30" rx="9" fill="var(--color-forest)" /><path d="M8 25C9 9 19 15 25 7C26 20 19 25 12 23M7 26L21 13M12 21L13 15M16 18L22 18" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
      <span className={styles.brandText}><span>Home Heat Planner</span><small>A cooler home starts here</small></span>
    </Link>
    <nav aria-label="Main navigation" className={styles.navigation}>
      <div className={styles.navLinks}>
        <details ref={exploreMenu} className={styles.exploreMenu} data-active={exploreActive} onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget)) closeExplore(); }} onKeyDown={event => { if (event.key === "Escape") { event.preventDefault(); closeExplore(); exploreMenu.current?.querySelector("summary")?.focus(); } }}>
          <summary>Explore more <svg viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="m4 6 4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg></summary>
          <div className={styles.exploreLinks}>
            <span className={styles.exploreEyebrow}>A MORE RESILIENT HOME</span>
            <Link href="/explore" aria-current={pathname === "/explore" ? "page" : undefined} onClick={closeExplore}><span className={styles.exploreIcon} aria-hidden="true"><svg viewBox="0 0 24 24" fill="none"><path d="m3 11 9-8 9 8M6 9v12h12V9M10 21v-7h4v7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg></span><span><strong>Home resilience</strong><small>Prepare for heat, floods and more</small></span><span aria-hidden="true">↗</span></Link>
            <Link href="/knowledge-base" aria-current={pathname === "/knowledge-base" ? "page" : undefined} onClick={closeExplore}><span className={styles.exploreIcon} aria-hidden="true"><svg viewBox="0 0 24 24" fill="none"><path d="M5 19C6 8 14 12 19 4c1 10-4 16-11 13M4 21 16 9M8 17v-5M11 14h5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg></span><span><strong>Simple techniques</strong><small>Small ways to use less energy</small></span><span aria-hidden="true">↗</span></Link>
          </div>
        </details>
        <Link href="/energy-assistant" aria-current={pathname === "/energy-assistant" ? "page" : undefined}>Energy Assistant →</Link>
        <Link href="/rewards" aria-current={pathname === "/marketplace" || pathname === "/rewards" ? "page" : undefined}>Rewards</Link>
        <Link href={pathname === "/" ? "#how-it-works" : "/#how-it-works"}>How it works</Link>
        <Link href={pathname === "/" ? "#help" : "/#help"}>Help</Link>
      </div>
      <Link href="/cooling-plan" className={styles.planLink} aria-current={planActive ? "page" : undefined}>
        <svg viewBox="0 0 20 20" fill="none" aria-hidden="true"><path d="M4 3.5h12v13l-6-3-6 3v-13Z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" /></svg>
        My Plan <span aria-hidden="true">↗</span>
      </Link>
      <Link href={account.user ? "/account" : "/sign-in"} className={styles.accountLink} aria-current={pathname === "/account" || pathname === "/sign-in" ? "page" : undefined}>{account.user ? "My account" : "Sign in"}</Link>
    </nav>
  </header>;
}
