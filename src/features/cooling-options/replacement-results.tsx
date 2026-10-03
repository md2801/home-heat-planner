import type { RoomProfile } from "../../domain/models";
import type { AssessmentDraft } from "../assessment/state";
import { replacementComparison, type ReplacementStep } from "./replacement";
import { financialSummary, financialText } from "./financial-summary";
import styles from "./replacement-guide.module.css";

export function ReplacementResults({ draft, profile, onEdit }: { draft: AssessmentDraft; profile: RoomProfile; onEdit: (step: ReplacementStep) => void }) {
  const result = replacementComparison(draft.replacement, profile);
  const fields = draft.replacement?.fields ?? {};
  const summary = financialSummary(result.comparison, result.upfront);
  const savings = result.comparison.annualNetSavings.amountAud;
  const savingsKnown = savings.status === "known";
  const paybackKnown = result.comparison.simplePaybackYears.status === "known";
  const higherCost = savings.status === "known" && typeof savings.value === "number" && savings.value < 0;
  return <section className={styles.results} aria-label="Your AC comparison results">
    <div className={styles.systems}>{([0, 1] as const).map(step => {
      const current = step === 0;
      const model = fields[current ? "existingModel" : "proposedModel"];
      const capacity = fields[current ? "existingCapacity" : "proposedCapacity"];
      const energy = fields[current ? "existingKwh" : "proposedKwh"];
      const cost = result.comparison[current ? "baseline" : "proposed"].amountAud;
      return <div key={step} className={styles.system}><div className={styles.systemHeading}><span>{current ? "YOUR CURRENT AC" : "THE REPLACEMENT"}</span><button type="button" onClick={() => onEdit(step)}>Edit {current ? "current AC" : "replacement"}</button></div><h4>{model?.trim() || "Add model details"}</h4><dl><div><dt>Cooling capacity</dt><dd>{capacity?.trim() ? `${capacity} kW output` : "Still to add"}</dd></div><div><dt>Yearly label cooling energy</dt><dd>{energy?.trim() ? `${energy} kWh/year` : "Still to add"}</dd></div>{cost.status === "known" && <div className={styles.runningCost}><dt>Annual label electricity cost</dt><dd>{financialText(cost)}</dd></div>}</dl></div>;
    })}</div>
    <p className={styles.resultCaption}>From the model labels you entered · Average climate zone · actual use and bills may differ</p>
    {savingsKnown ? <div className={styles.outcome}><span>UNDER STANDARD ANNUAL LABEL CONDITIONS</span><h4>{higherCost ? "This replacement would cost more to run" : "Your annual cost comparison"}</h4><dl className={styles.metrics}><div><dt>{higherCost ? "Annual extra cost" : "Annual net savings"}</dt><dd>{summary.savings}</dd><small>Electricity and additional yearly costs</small></div>{result.upfront.status === "known" && <div><dt>Installed price</dt><dd>{summary.cost}</dd><small>{result.costScope}</small></div>}{paybackKnown && <div><dt>Simple payback</dt><dd>{summary.payback}</dd><small>Undiscounted · under these assumptions</small></div>}</dl>{!paybackKnown && <p>{summary.reason}</p>}{paybackKnown && result.lifeWarning && <p>{result.lifeWarning}</p>}</div> : <div className={styles.pending}><div><span>YOUR COMPARISON IS IN PROGRESS</span><h4>A few details still need checking</h4><p>Add the remaining label, quote and bill details, then confirm the checks below to calculate savings.</p></div><button type="button" onClick={() => onEdit(2)}>Review rate & quote →</button>{result.upfront.status === "known" && <p className={styles.quotePreview}>Installed quote: <strong>{summary.cost}</strong> · {result.costScope}</p>}</div>}
    {result.gaps.length > 0 && <details className={styles.moreDetails}><summary>See what’s still needed <span aria-hidden="true">⌄</span></summary><ul>{result.gaps.map(gap => <li key={gap}>{gap}</li>)}</ul></details>}
    {draft.replacement && <details className={styles.moreDetails}><summary>How this comparison is calculated <span aria-hidden="true">⌄</span></summary><p>Annual net savings = (current cooling kWh − replacement cooling kWh) × usage rate + current extra yearly costs − replacement extra yearly costs.</p><p>Simple payback = installed price ÷ positive annual net savings. Zero-cost actions have no upfront cost to recover.</p><ul>{result.comparison.annualNetSavings.assumptions.map(assumption => <li key={assumption.id}>{assumption.description}</li>)}</ul><ul>{result.comparison.annualNetSavings.limitations.filter(limitation => !result.gaps.includes(limitation)).map(limitation => <li key={limitation}>{limitation}</li>)}</ul><details><summary>View supplied inputs</summary><ul>{result.inputRows.map(row => <li key={row}>{row}</li>)}</ul></details></details>}
  </section>;
}
