import type { AssessmentDraft } from "../assessment/state";
import { financialSummary } from "../cooling-options/financial-summary";
import styles from "./follow-up.module.css";
export function HistoryReview({ draft }: { draft: AssessmentDraft }) {
  if (!draft.history?.length) return null;
  return <details className={styles.history}><summary>Earlier saved plans and check-ins ({draft.history.length})</summary>{draft.history.map(entry => {
    const snapshot = entry.plan.comparisonSnapshot;
    const financial = snapshot.status === "known" ? financialSummary(snapshot.value, entry.plan.upfrontCostAud) : null;
    return <section key={`${entry.plan.id}-${entry.archivedAt}`}><h3>{entry.plan.selectedActionLabel}</h3><p>Original saved estimate: {financial?.cost ?? "Unknown cost"} · {financial?.savings ?? "Unknown savings"} · payback {financial?.payback ?? "Unavailable"}</p><p>{entry.reason}</p>{entry.checkIns.map(check => <p key={`${check.id}-${check.updatedAt}`}>Check-in {check.savedAt.status === "known" ? check.savedAt.value.slice(0, 10) : "unsaved"}: {check.status.status === "known" ? check.status.value : "Unknown"} · spending {check.actualCostAud.status === "known" ? `$${check.actualCostAud.value}` : "Not recorded"} · {check.note.status === "known" ? check.note.value : "No note"}</p>)}</section>;
  })}<p>Earlier estimates are retained for review; they are not current recommendations. Clear assessment deletes this browser’s history.</p></details>;
}
