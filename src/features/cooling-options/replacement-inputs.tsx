"use client";
import type { AssessmentDraft } from "../assessment/state";
import { plannerClient as assessmentRepository } from "../../services/planner";
import { emptyReplacement, LABEL_SOURCE, replacementChecks, replacementFields } from "./replacement";
import styles from "./cooling-options.module.css";

export function ReplacementInputForm({ draft }: { draft: AssessmentDraft }) {
  const input = draft.replacement ?? emptyReplacement(new Date().toISOString());
  return <details className={styles.inputDisclosure}><summary>Compare a replacement AC using its energy labels and quote</summary>
    <p>This narrow comparison needs two equal-capacity, non-ducted single-split models, suitable bedroom sizing and Average climate-zone cooling figures. Older labels, a shared system or missing evidence leave savings unavailable.</p>
    <p><a href={LABEL_SOURCE} target="_blank" rel="noreferrer">How the Energy Rating method works ↗</a> · <a href="https://calculator.energyrating.gov.au/" target="_blank" rel="noreferrer">Check your climate zone ↗</a></p>
    <div className={styles.inputGrid}>{replacementFields.map(([key, label, type]) => <label key={key}>{label}<input type={type} min={type === "number" ? 0 : undefined} step={type === "number" ? "any" : undefined} maxLength={500} value={input.fields[key] ?? ""} onChange={event => assessmentRepository.save({ ...draft, replacement: { ...input, updatedAt: new Date().toISOString(), fields: { ...input.fields, [key]: event.target.value } } })} /></label>)}</div>
    {replacementChecks.map(([key, label]) => <label key={key} className={styles.confirmation}><input type="checkbox" checked={input.confirmations[key] ?? false} onChange={event => assessmentRepository.save({ ...draft, replacement: { ...input, updatedAt: new Date().toISOString(), confirmations: { ...input.confirmations, [key]: event.target.checked } } })} />{label}</label>)}
    <p>Labels and quotes are transcribed by you. We do not independently verify them. Empty fields remain unknown; enter zero only when it is supported.</p>
  </details>;
}
