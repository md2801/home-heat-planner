import Link from "next/link";
import type { RoomProfile } from "../../domain/models";
import type { AssessmentDraft } from "../assessment/state";
import { replacementComparison } from "./replacement";
import { ReplacementInputForm } from "./replacement-inputs";
import { financialSummary, financialText } from "./financial-summary";
import styles from "./cooling-options.module.css";

export function ReplacementComparison({ draft, profile }: { draft: AssessmentDraft; profile: RoomProfile }) {
  const result = replacementComparison(draft.replacement, profile);
  const summary = financialSummary(result.comparison, result.upfront);
  const savingsKnown = result.comparison.annualNetSavings.amountAud.status === "known";
  const paybackKnown = result.comparison.simplePaybackYears.status === "known";
  const hasFigures = result.upfront.status === "known" || savingsKnown || paybackKnown;
  return <details id="ac-cost-comparison" className={styles.optionalSection}>
    <summary><span><strong>Compare costs and savings</strong><small>Optional · compare a replacement AC using energy labels and a quote</small></span><span aria-hidden="true">⌄</span></summary>
    <div className={styles.optionalBody}>
      <p>Compare two suitable, equal-capacity AC systems under the label’s standard annual conditions. Add their energy labels, your electricity rate and an installed quote to calculate the comparison.</p>
      {hasFigures ? <>
        <dl className={styles.financialFigures} aria-label="AC financial comparison">
          {result.upfront.status === "known" && <div><dt>Installed quote</dt><dd>{summary.cost}</dd><small>{result.costScope}</small></div>}
          {savingsKnown && <div><dt>Annual net savings</dt><dd>{summary.savings}</dd><small>Standard annual label conditions · actual bills may differ</small></div>}
          {paybackKnown && <div><dt>Simple payback</dt><dd>{summary.payback}</dd><small>Simple, undiscounted · under the displayed annual assumptions</small></div>}
        </dl>
        {savingsKnown && !paybackKnown && <p>{summary.reason}</p>}
        {paybackKnown && result.lifeWarning && <p>{result.lifeWarning}</p>}
      </> : <p className={styles.comparisonPrompt}>Start with the details below. Figures will appear when the required inputs are complete.</p>}
      <ReplacementInputForm draft={draft} />
      {result.gaps.length > 0 && <details className={styles.inputDisclosure}><summary>What’s needed to complete the comparison</summary><ul>{result.gaps.map(gap => <li key={gap}>{gap}</li>)}</ul><p>Room permissions and whether your AC serves only this bedroom can be updated in <Link href="/assessment">your room answers</Link>.</p></details>}
      {draft.replacement && <details className={styles.inputDisclosure}><summary>Inputs, assumptions and calculation</summary><ul>{result.inputRows.map(row => <li key={row}>{row}</li>)}</ul>
        <p>Annual net savings = (existing cooling kWh − replacement cooling kWh) × tariff + existing additional recurring costs − replacement additional recurring costs.</p>
        {savingsKnown && <p>Label annual electricity: {financialText(result.comparison.baseline.amountAud)} before; {financialText(result.comparison.proposed.amountAud)} after.</p>}
        <p>Simple payback = installed quote ÷ positive annual net savings. Zero-cost actions have no upfront cost to recover.</p>
        <ul>{result.comparison.annualNetSavings.assumptions.map(assumption => <li key={assumption.id}>{assumption.description}</li>)}</ul>
        <ul>{result.comparison.annualNetSavings.limitations.map(limitation => <li key={limitation}>{limitation}</li>)}</ul>
      </details>}
    </div>
  </details>;
}
