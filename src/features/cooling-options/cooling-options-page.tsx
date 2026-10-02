"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useSyncExternalStore } from "react";
import { JourneyHeader } from "@/components/layout/journey-header";
import { assessmentRepository } from "@/features/assessment/repository";
import { contributorEvidence } from "@/features/heat-contributors/evidence";
import { factText, formatMoney } from "@/features/room-baseline/model";
import { coolingOptions, coolingOptionsDestination, refineBudget, selectCoolingOption } from "./model";
import styles from "./cooling-options.module.css";

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
          <div className={styles.value}><span className={styles.mobileLabel}>Upfront cost</span><strong>Quote needed</strong><span>Scope & price not established</span></div>
          <div className={styles.value}><span className={styles.mobileLabel}>Potential savings</span><strong>Unavailable</strong><span>No action-specific savings method</span></div>
          <div className={styles.value}><span className={styles.mobileLabel}>Simple payback</span><strong>Unavailable</strong><span>Cost & positive annual savings needed</span></div>
          <div className={styles.choose}><span className={styles.mobileLabel}>Budget & next step</span><p>Budget fit unknown</p><small>{option.readiness}</small><button aria-pressed={view.selected?.id === option.id} className={view.selected?.id === option.id ? styles.chosen : styles.secondary} onClick={() => assessmentRepository.save(selectCoolingOption(draft, option.id, new Date().toISOString()))}>{view.selected?.id === option.id ? "Selected ✓" : "Choose option"}<span className={styles.srOnly}> · {option.title}</span></button></div>
        </div>
        <div className={styles.disclosures}>
          <details><summary>Why it fits <span aria-hidden="true">⌄</span></summary><div><p>{option.contributor.explanation}</p><dl>{option.contributor.reasons.map(reason => <div key={reason.fieldId}><dt>{reason.label}</dt><dd>{reason.value} · {reason.fact.status === "known" ? "Reported by you" : "Unknown"}</dd></div>)}</dl><p>{option.recommendation.description}</p></div></details>
          <details><summary>Assumptions <span aria-hidden="true">⌄</span></summary><div><p>No intervention reduction, price or savings assumption has been supplied. We have not assigned one.</p><ul>{option.recommendation.requiredChecks.map(check => <li key={check}>{check}</li>)}</ul>{option.recommendation.comfortTradeOffs.map(tradeoff => <p key={tradeoff}>{tradeoff}</p>)}<p>{option.comparison.annualNetSavings.limitations[0]}</p><p>Payback requires a valid installed cost divided by positive supported annual net savings. Neither is established here.</p></div></details>
          <details><summary>Evidence <span aria-hidden="true">⌄</span></summary><div><p>General guidance supports investigation, not personalised numerical savings.</p>{contributorEvidence.filter(source => option.recommendation.sourceIds.includes(source.id)).map(source => <div className={styles.source} key={source.id}><a href={source.url} target="_blank" rel="noreferrer">{source.title} ↗</a><p>{source.excerpt}</p><small>Reviewed {source.reviewedAt} · {source.contentVersion}</small></div>)}<small>Selection rules: {option.recommendation.catalogueVersion}</small></div></details>
        </div>
      </article>)}</> : <div className={styles.empty}><h2>No option established yet</h2><p>Your supplied facts do not establish one of these investigation paths. We won’t infer suitability from unknown answers.</p><Link href="/assessment">Refine my answers →</Link></div>}
    </section>
    <div className={styles.notes}><p>Costs, savings and payback remain unavailable until the relevant price and calculation evidence exist. A quote-required investigation can still be your next step.</p>
      <details><summary>Your cooling baseline & information to confirm <span aria-hidden="true">⌄</span></summary><div>{view.baseline.result?.amountAud.status === "known" ? <><p>{view.baseline.kind === "scenario" ? "What-if baseline" : "Measured-use baseline"}: {typeof view.baseline.result.amountAud.value === "number" ? formatMoney(view.baseline.result.amountAud.value) : "Range"} · {view.baseline.periodLabel}</p><p>{view.baseline.arithmetic}</p><ul>{view.baseline.inputRows.map(row => <li key={row.label}>{row.label}: {row.value} · {row.provenance}</li>)}</ul><p>This baseline does not establish what any option would save.</p></> : <><p>Cooling cost not available yet.</p><ul>{view.baseline.missing.map(item => <li key={item}>{item}</li>)}</ul></>}{view.gaps.length > 0 && <><h3>Room information to confirm</h3><ul>{view.gaps.map(gap => <li key={gap}>{gap}</li>)}</ul></>}<Link href="/room-baseline">Review room & calculation →</Link></div></details>
      <Link href="/assessment">Refine my answers →</Link>
    </div>
    {notice && <p role="status" className={styles.notice}>{notice}</p>}
    <footer className={styles.footer}><Link href="/heat-contributors">← Back</Link><div><p role="status">{view.selected ? `${view.selected.title} selected as your next investigation.` : "Choose an option to continue."}</p><button className={styles.primary} disabled={!view.selected} onClick={() => { const destination = coolingOptionsDestination(assessmentRepository.getSnapshot().draft); if (destination) router.push(destination); }}>Continue to my cooling plan →</button></div></footer>
  </> : <p className={styles.notice} role="status">Loading your room answers…</p>}</div>;
}
