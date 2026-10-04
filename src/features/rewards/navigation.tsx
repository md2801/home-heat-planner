import Link from "next/link";
import styles from "./rewards.module.css";
export function RewardsNavigation({ marketplace = false }: { marketplace?: boolean }) {
  return <nav className={styles.navigation} aria-label="Rewards navigation">
    <Link href="/rewards" aria-current={!marketplace ? "page" : undefined}>Earn coins</Link>
    <Link href="/rewards#approvals">Approvals</Link>
    <Link href="/marketplace" aria-current={marketplace ? "page" : undefined}>Marketplace</Link>
  </nav>;
}
