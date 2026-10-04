"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useSyncExternalStore } from "react";
import { JourneyHeader } from "@/components/layout/journey-header";
import { plannerClient } from "@/services/planner";
import { accountStore } from "./account-store";
import { coolingPlan } from "../cooling-plan/model";
import styles from "./account.module.css";

export function AccountPage() {
  const router = useRouter();
  const account = useSyncExternalStore(accountStore.subscribe, accountStore.getSnapshot, accountStore.getServerSnapshot);
  const assessment = useSyncExternalStore(plannerClient.subscribe, plannerClient.getSnapshot, plannerClient.getServerSnapshot);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function signOut() {
    setBusy(true); setError(null);
    try { await accountStore.signOut(); router.push("/sign-in"); router.refresh(); }
    catch { setError("Could not sign out. Please retry."); setBusy(false); }
  }
  const hasAnswers = Object.keys(assessment.draft.answers).length > 0;
  const plan = coolingPlan(assessment.draft, new Date().toISOString()).plan;
  return <div className={styles.page}><JourneyHeader /><section className={styles.accountContent}>
    {account.user ? <><div className={styles.accountHeading}><div><p className={styles.hint}>{account.user.email}</p><h1>Your home’s next steps</h1><p>Welcome back, {account.user.name || "homeowner"}. Your room journey stays together here.</p></div><button className={styles.secondary} disabled={busy} onClick={() => void signOut()}>{busy ? "Signing out…" : "Sign out"}</button></div>
      <div className={styles.syncStatus} role="status"><span className={styles.statusDot} data-saved={account.phase === "saved"} />{account.message}{account.phase === "offline" && <button className={styles.textButton} onClick={() => void accountStore.retry()}>Retry saving</button>}{account.phase === "signed-out" && <Link href="/sign-in">Sign in again</Link>}</div>
      {account.phase === "conflict" && <section className={styles.conflict} aria-labelledby="conflict-title"><h2 id="conflict-title">Two versions of your journey</h2><p>This device and your account have different progress. Choose one version to continue. The other version will be replaced on this device or in your account.</p><div className={styles.actionRow}><button className={styles.secondary} onClick={() => void accountStore.resolve("account")}>Use saved account version</button><button className={styles.primary} onClick={() => void accountStore.resolve("device")}>Keep this device’s version</button></div></section>}
      {account.importDraft && <section className={styles.import} aria-labelledby="import-title"><h2 id="import-title">Bring your assessment with you</h2><p>There’s an assessment saved in this browser. Your account has no room answers yet. Save this browser’s assessment to your account to continue on other devices.</p><div className={styles.actionRow}><button className={styles.primary} onClick={() => accountStore.importGuest()}>Save browser assessment to my account</button><button className={styles.textButton} onClick={() => accountStore.dismissImport()}>Start fresh instead</button></div></section>}
      <div className={styles.journeySummary}><div className={styles.summaryMark} aria-hidden="true"><svg viewBox="0 0 40 40" fill="none" stroke="currentColor" strokeWidth="1.7"><path d="M5 18L20 5L35 18M9 16V35H31V16M17 35V24H24V35" /></svg></div><div><h2>{hasAnswers ? "Your bedroom journey" : "Start with one bedroom"}</h2><p>{plan ? plan.selectedActionLabel : hasAnswers ? "Your room answers are saved. Continue your assessment or explore your room plan." : "Tell us where the heat is getting in. You can leave anything you don’t know as unknown."}</p><div className={styles.actionRow}><Link className={styles.primary} href={plan ? "/cooling-plan" : "/assessment"}>{plan?.savedAt.status === "known" ? "Open my room plan" : plan ? "Continue my room plan" : hasAnswers ? "Continue my assessment" : "Start my assessment"}</Link>{plan?.savedAt.status === "known" && <Link className={styles.secondary} href="/follow-up">Record a check-in</Link>}</div></div></div>
      <div className={styles.actionRow}><Link className={styles.secondary} href="/rewards">Earn coins with task photos</Link><Link className={styles.secondary} href="/rewards#approvals">View task approvals</Link><Link className={styles.secondary} href="/marketplace">Open marketplace</Link></div>
      <p className={styles.privacy}>Room answers, selected improvements, your plan and check-ins save automatically to your account. Coins and approval results are saved privately to your account. When you’re offline, journey changes stay on this device until saving succeeds. Sign out when using a shared device.</p>
    </> : <><h1>Keep your room journey together</h1><p>Sign in to save your assessment, plan and check-ins to your own account and return on another device.</p><Link className={styles.primary} href="/sign-in">Sign in</Link><Link className={styles.secondary} href="/assessment">Continue in this browser</Link></>}
    {error && <p role="alert" className={styles.error}>{error}</p>}
  </section></div>;
}
