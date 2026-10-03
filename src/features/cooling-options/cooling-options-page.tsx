"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useSyncExternalStore } from "react";
import { JourneyHeader } from "@/components/layout/journey-header";
import { plannerClient as assessmentRepository } from "@/services/planner";
import { contributorEvidence } from "@/features/heat-contributors/evidence";
import { factText, formatMoney } from "@/features/room-baseline/model";
import { coolingOptions, coolingOptionsDestination, refineBudget, selectCoolingOption } from "./model";
import styles from "./cooling-options.module.css";
import { DynamicRoom as RoomScene } from "../room-scene/dynamic-room";
import { assessmentScene } from "../room-scene/assessment-scene";
import { FinancialCoach } from "./financial-coach";
import { ReplacementInputForm } from "./replacement-inputs";
import { replacementComparison } from "./replacement";
import { financialSummary, financialText } from "./financial-summary";
import { CoolingResearch } from "./cooling-research";

export function CoolingOptionsPage() {
  const { draft, ready, notice } = useSyncExternalStore(assessmentRepository.subscribe, assessmentRepository.getSnapshot, assessmentRepository.getServerSnapshot);
  const router = useRouter();
  useEffect(() => { assessmentRepository.hydrate(); }, []);
  const view = coolingOptions(draft);
  const budget = factText(view.baseline.profile.budgetAud, value => typeof value === "number" ? `${formatMoney(value)} maximum` : `${formatMoney(value.min)}–${formatMoney(value.max)}`);
  return <div className={styles.page}><JourneyHeader />{ready ? <>
    <div className={styles.heading}><div><h1>Your cooling options</h1><p>Next steps based on your room. Budget: {budget}.</p></div><button className={styles.secondary} onClick={() => { assessmentRepository.save(refineBudget(draft)); router.push("/assessment"); }}>Change budget</button></div>
    <p className={styles.context}>Compare what’s worth investigating. Selection is a next step, with suitability and costs still to confirm.</p>
    <section className={styles.comparison} aria-label="Cooling option comparison">
      {view.options.length > 0 ? <><div className={styles.columns} aria-hidden="true"><span>Option</span><span>Upfront cost</span><span>Potential savings</span><span>Simple payback</span><span>Budget & next step</span></div>
      {view.options.map(option => <article key={option.id} className={`${styles.option} ${view.selected?.id === option.id ? styles.selected : ""}`} aria-labelledby={`${option.id}-title`}>
        <div className={styles.row}><div className={styles.name}><span className={styles.status}>{({ "supported-estimate": "Supported estimate", "what-if": "What-if scenario", "insufficient-evidence": "Insufficient evidence" })[option.status]} · financial result</span><h2 id={`${option.id}-title`}>{option.title}</h2><p>{option.description}</p></div>
          <div className={styles.value}><span className={styles.mobileLabel}>Upfront cost</span><strong>{financialSummary(option.comparison, option.recommendation.upfrontCostAud).cost}</strong><span>{factText(option.recommendation.costScope)}</span></div>
          <div className={styles.value}><span className={styles.mobileLabel}>Potential net savings</span><strong>{financialSummary(option.comparison, option.recommendation.upfrontCostAud).savings}</strong><span>{option.id === "ac-replacement" ? "Standard annual label conditions" : "No action-specific savings method"}</span></div>
          <div className={styles.value}><span className={styles.mobileLabel}>Simple payback</span><strong>{financialSummary(option.comparison, option.recommendation.upfrontCostAud).payback}</strong><span>{financialSummary(option.comparison, option.recommendation.upfrontCostAud).reason}</span></div>
          <div className={styles.choose}><span className={styles.mobileLabel}>Budget & next step</span><p>{({ "cost-not-established": "Budget fit unknown", "within-budget": "Fits reported budget", "above-budget": "Above reported budget" })[option.budgetStatus]}</p><small>{option.readiness}</small><button aria-pressed={view.selected?.id === option.id} className={view.selected?.id === option.id ? styles.chosen : styles.secondary} onClick={() => assessmentRepository.save(selectCoolingOption(draft, option.id, new Date().toISOString()))}>{view.selected?.id === option.id ? "Selected ✓" : "Choose option"}<span className={styles.srOnly}> · {option.title}</span></button></div>
        </div>
        <div className={styles.disclosures}>
          <details><summary>Why it fits <span aria-hidden="true">⌄</span></summary><div><p>{option.contributor.explanation}</p><dl>{option.contributor.reasons.map(reason => <div key={reason.fieldId}><dt>{reason.label}</dt><dd>{reason.value} · {reason.fact.status === "known" ? "Reported by you" : "Unknown"}</dd></div>)}</dl><p>{option.recommendation.description}</p></div></details>
          <details><summary>Assumptions <span aria-hidden="true">⌄</span></summary><div><p>{option.id === "ac-replacement" ? "See the supplied model labels, tariff, quote and standard annual conditions below. This is a supported label comparison; household savings may differ." : "No numerical intervention effect or price is established for this investigation."}</p><ul>{option.recommendation.requiredChecks.map(check => <li key={check}>{check}</li>)}</ul>{option.recommendation.comfortTradeOffs.map(tradeoff => <p key={tradeoff}>{tradeoff}</p>)}<p>{option.comparison.annualNetSavings.limitations[0]}</p><p>{financialSummary(option.comparison, option.recommendation.upfrontCostAud).reason}</p></div></details>
          <details><summary>Evidence <span aria-hidden="true">⌄</span></summary><div><p>{option.id === "ac-replacement" ? "The documented label method supports this standard-condition equipment comparison." : "General guidance supports investigation, not personalised numerical savings."}</p>{contributorEvidence.filter(source => option.recommendation.sourceIds.includes(source.id)).map(source => <div className={styles.source} key={source.id}><a href={source.url} target="_blank" rel="noreferrer">{source.title} ↗</a><p>{source.excerpt}</p><small>Reviewed {source.reviewedAt} · {source.contentVersion}</small></div>)}<small>Selection rules: {option.recommendation.catalogueVersion}</small></div></details>
        </div>
      </article>)}</> : <div className={styles.empty}><div><span className={styles.emptyEyebrow}>LET’S START WITH YOUR ROOM</span><h2>A few details.<br />A clearer way forward.</h2><p>Tell us about your room and cooling use so we can identify suitable improvements and explain their costs.</p><Link href="/assessment" className={styles.emptyAction}>Complete my room profile <span aria-hidden="true">→</span></Link><small>Not sure about something? You can leave it unknown.</small></div><div className={styles.emptyScene}><RoomScene scene={assessmentScene(draft.answers, draft.sceneDetails)} /><p>Illustrative layout · built from your answers</p></div></div>}
    </section>
    <CoolingResearch draft={draft} selectedId={view.selected?.id ?? null} onChoose={id => assessmentRepository.save(selectCoolingOption(draft, id, new Date().toISOString()))} />
    <div className={styles.notes}><h2>Explore a cooler room</h2><p>Try a 24-hour heat-balance scenario for shading, insulation and night ventilation, with explicit assumptions and cooling electricity costs.</p><Link href="/thermal-scenario">Open experimental temperature & cost simulator →</Link></div>
    <FinancialCoach draft={draft} />
    {view.options.some(option => option.id === "ac-replacement") && <ReplacementInputForm draft={draft} />}
    {draft.replacement && <details className={styles.inputDisclosure}><summary>Replacement comparison inputs and calculation</summary><ul>{replacementComparison(draft.replacement, view.baseline.profile).inputRows.map(row => <li key={row}>{row}</li>)}</ul><p>Annual net savings = (existing cooling kWh − replacement cooling kWh) × tariff + existing additional recurring costs − replacement additional recurring costs.</p><p>Label annual electricity: {financialText(replacementComparison(draft.replacement, view.baseline.profile).comparison.baseline.amountAud)} before; {financialText(replacementComparison(draft.replacement, view.baseline.profile).comparison.proposed.amountAud)} after.</p><p>Simple payback = installed quote ÷ positive annual net savings. Zero-cost actions have no upfront cost to recover.</p><ul>{replacementComparison(draft.replacement, view.baseline.profile).gaps.map(gap => <li key={gap}>{gap}</li>)}</ul></details>}
    <div className={styles.notes}><p>Replacement figures require the displayed label method and quote inputs. Other investigations remain unpriced and unquantified. A missing price does not establish affordability.</p>
      <details><summary>Your cooling baseline & information to confirm <span aria-hidden="true">⌄</span></summary><div>{view.baseline.result?.amountAud.status === "known" ? <><p>{view.baseline.kind === "scenario" ? "What-if baseline" : "Measured-use baseline"}: {typeof view.baseline.result.amountAud.value === "number" ? formatMoney(view.baseline.result.amountAud.value) : "Range"} · {view.baseline.periodLabel}</p><p>{view.baseline.arithmetic}</p><ul>{view.baseline.inputRows.map(row => <li key={row.label}>{row.label}: {row.value} · {row.provenance}</li>)}</ul><p>This baseline does not establish what any option would save.</p></> : <><p>Cooling cost not available yet.</p><ul>{view.baseline.missing.map(item => <li key={item}>{item}</li>)}</ul></>}{view.gaps.length > 0 && <><h3>Room information to confirm</h3><ul>{view.gaps.map(gap => <li key={gap}>{gap}</li>)}</ul></>}<Link href="/room-baseline">Review room & calculation →</Link></div></details>
      <Link href="/assessment">Refine my answers →</Link>
    </div>
    {notice && <p role="status" className={styles.notice}>{notice}</p>}
    <footer className={styles.footer}><Link href="/heat-contributors">← Back</Link><div><p role="status">{view.selected ? `${view.selected.title} selected as your next investigation.` : "Choose an option to continue."}</p><button className={styles.primary} disabled={!view.selected} onClick={() => { const destination = coolingOptionsDestination(assessmentRepository.getSnapshot().draft); if (destination) router.push(destination); }}>Continue to my cooling plan →</button></div></footer>
  </> : <p className={styles.notice} role="status">Loading your room answers…</p>}</div>;
}
