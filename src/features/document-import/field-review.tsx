"use client";
import { useState } from "react";
import { documentFieldLabel, documentUnits, isNumericDocumentField } from "../../contracts/document-import.ts";
import { acceptDocumentField, correctDocumentField, rejectDocumentField, type ReviewedDocumentField } from "./review.ts";
import styles from "./document-import.module.css";
export function reviewLabel(field: ReviewedDocumentField["proposal"]["field"]): string {
  if (field === "existingKwh" || field === "proposedKwh") return "Labelled cooling energy";
  if (field === "installedCost") return "Upfront installation cost";
  if (field === "proposedRecurring") return "Recurring costs, as stated";
  return documentFieldLabel(field);
}
export function FieldReview({ item, onChange, locked }: { item: ReviewedDocumentField; onChange: (value: ReviewedDocumentField) => void; locked: boolean }) {
  const { field } = item.proposal;
  const [editing, setEditing] = useState(false);
  const [raw, setRaw] = useState(String(item.value ?? ""));
  const [unit, setUnit] = useState(item.unit ?? "");
  const [basis, setBasis] = useState(item.calculationBasis ?? "");
  const [error, setError] = useState<string | null>(null);
  const numeric = isNumericDocumentField(field);
  const label = reviewLabel(field);
  const update = (operation: () => ReviewedDocumentField) => {
    try { onChange(operation()); setEditing(false); setError(null); }
    catch (failure) { setError(failure instanceof Error ? failure.message : "Check this value before saving."); }
  };
  function edit() { setRaw(String(item.value ?? "")); setUnit(item.unit ?? ""); setBasis(item.calculationBasis ?? ""); setError(null); setEditing(true); onChange({ ...item, decision: "pending", reviewedAt: null }); }
  return <section className={styles.field} aria-labelledby={`title-${field}`} data-field={field}>
    <div className={styles.fieldHeading}><h3 id={`title-${field}`}>{label}</h3><span className={styles.decision}>{item.decision === "pending" ? "Review needed" : item.decision === "accepted" ? "Confirmed" : item.decision === "corrected" ? "Corrected by you" : "Kept unknown"}</span></div>
    {editing ? <form onSubmit={event => { event.preventDefault(); update(() => correctDocumentField(item, raw, numeric ? unit || null : null, basis, new Date().toISOString())); }} className={styles.editForm}>
      <label htmlFor={`value-${field}`}>Correct {label.toLowerCase()}<input id={`value-${field}`} value={raw} onChange={event => setRaw(event.target.value)} type={["periodStart", "periodEnd", "quoteDate"].includes(field) ? "date" : "text"} inputMode={numeric ? "decimal" : undefined} maxLength={1000} autoFocus /></label>
      {numeric && <><label htmlFor={`unit-${field}`}>Unit as printed<select id={`unit-${field}`} value={unit} onChange={event => setUnit(event.target.value)}><option value="">Select the printed unit</option>{documentUnits(field).map(value => <option key={value}>{value}</option>)}</select></label><label htmlFor={`basis-${field}`} className={styles.basisInput}>Climate, period or recurrence as printed<input id={`basis-${field}`} value={basis} maxLength={500} onChange={event => setBasis(event.target.value)} placeholder="Leave blank if not stated" /></label></>}
      <div className={styles.fieldActions}><button className={styles.primary} type="submit">Save correction</button><button type="button" onClick={() => setEditing(false)}>Cancel edit</button></div>
    </form> : <>
      <p className={item.value === null ? styles.unknown : styles.fieldValue}>{item.value === null ? "Not identified or ambiguous" : <>{item.value}{item.unit && <span> {item.unit}</span>}</>}</p>
      {item.calculationBasis && <p className={styles.basis}>Basis as printed: {item.calculationBasis}</p>}
      {item.decision === "corrected" && <p className={styles.small}>This is your correction. The original excerpt below is retained for reference.</p>}
      {!locked && <div className={styles.fieldActions}>
        {item.proposal.value !== null && <button type="button" onClick={() => update(() => acceptDocumentField(item, new Date().toISOString()))}>Confirm value</button>}
        <button type="button" onClick={edit}>{item.value === null ? "Enter a value" : "Correct value"}</button>
        <button type="button" onClick={() => update(() => rejectDocumentField(item, new Date().toISOString()))}>{item.value === null ? "Keep unknown" : "Reject value"}</button>
      </div>}
    </>}
    {item.proposal.sourceExcerpt && <details className={styles.evidence}><summary>Original source excerpt{item.proposal.sourcePage ? ` · Page ${item.proposal.sourcePage}` : ""}</summary><blockquote>{item.proposal.sourceExcerpt}</blockquote></details>}
    {error && <p className={styles.fieldError} role="alert">{error}</p>}
  </section>;
}
