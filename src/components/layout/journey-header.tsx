import Link from "next/link";
import styles from "./journey-header.module.css";

export function JourneyHeader() {
  return <header className={styles.header}>
    <Link href="/" className={styles.brand}><svg viewBox="0 0 32 32" fill="none" aria-hidden="true"><rect x="2" y="2" width="28" height="28" rx="4" fill="var(--color-heat-light)" stroke="var(--color-forest)" strokeWidth="2" /><path d="M8 25C9 9 19 15 25 7C26 20 19 25 12 23M7 26L21 13M12 21L13 15M16 18L22 18" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg><span>Home Heat Planner</span></Link>
    <nav aria-label="Main navigation" className={styles.navigation}><Link href="/cooling-plan">My Plan</Link><Link href="/#how-it-works">How it works</Link><Link href="/#help">Help</Link></nav>
  </header>;
}
