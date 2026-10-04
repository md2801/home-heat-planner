"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import styles from "./journey-header.module.css";

export function JourneyHeader() {
  const pathname = usePathname();
  const planActive = pathname === "/cooling-plan";
  return <header className={styles.header}>
    <Link href="/" className={styles.brand} aria-label="Home Heat Planner home">
      <svg viewBox="0 0 32 32" fill="none" aria-hidden="true"><rect x="1" y="1" width="30" height="30" rx="9" fill="var(--color-forest)" /><path d="M8 25C9 9 19 15 25 7C26 20 19 25 12 23M7 26L21 13M12 21L13 15M16 18L22 18" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
      <span className={styles.brandText}><span>Home Heat Planner</span><small>A cooler home starts here</small></span>
    </Link>
    <nav aria-label="Main navigation" className={styles.navigation}>
      <div className={styles.navLinks}>
        <Link href="/knowledge-base" aria-current={pathname === "/knowledge-base" ? "page" : undefined}>Simple techniques</Link>
        <Link href={pathname === "/" ? "#how-it-works" : "/#how-it-works"}>How it works</Link>
        <Link href={pathname === "/" ? "#help" : "/#help"}>Help</Link>
      </div>
      <Link href="/cooling-plan" className={styles.planLink} aria-current={planActive ? "page" : undefined}>
        <svg viewBox="0 0 20 20" fill="none" aria-hidden="true"><path d="M4 3.5h12v13l-6-3-6 3v-13Z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" /></svg>
        My Plan <span aria-hidden="true">↗</span>
      </Link>
    </nav>
  </header>;
}
