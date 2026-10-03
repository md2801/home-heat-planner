"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useSyncExternalStore } from "react";
import { JourneyHeader } from "@/components/layout/journey-header";
import { plannerClient as assessmentRepository } from "@/services/planner";
import { factText, formatMoney } from "@/features/room-baseline/model";
import { coolingOptions, coolingOptionsDestination, refineBudget, selectCoolingOption } from "./model";
import styles from "./cooling-options.module.css";
import { DynamicRoom as RoomScene } from "../room-scene/dynamic-room";
import { assessmentScene } from "../room-scene/assessment-scene";
import { FinancialCoach } from "./financial-coach";
import { ReplacementComparison } from "./replacement-comparison";
import { CoolingResearch } from "./cooling-research";
import { techniques } from "../knowledge-base/catalogue";
import { coolingResearchContext } from "./research-context";
import { recommendationResources } from "../knowledge-base/recommendation-resources";
import { hasReportedAC } from "./recommendation-policy";

export function CoolingOptionsPage() {
  const { draft, ready, notice } = useSyncExternalStore(assessmentRepository.subscribe, assessmentRepository.getSnapshot, assessmentRepository.getServerSnapshot);
  const router = useRouter();
  useEffect(() => { assessmentRepository.hydrate(); }, []);
  const view = coolingOptions(draft);
  const context = coolingResearchContext(draft);
  const hasGuidance = view.options.length > 0 || recommendationResources(context).techniqueIds.length > 0;
  const budget = view.baseline.profile.budgetAud;
  const budgetText = factText(budget, value => typeof value === "number" ? `${formatMoney(value)} maximum` : `${formatMoney(value.min)}–${formatMoney(value.max)}`);
  return <div className={styles.page}><JourneyHeader />{ready ? <>
    <div className={styles.heading}><div><h1>Your path to a cooler room</h1><p>Keep heat out, release it when conditions allow, and cool efficiently when needed.</p>{budget.status === "known" && <span className={styles.budgetNote}>Your reported budget: {budgetText}.</span>}</div><button className={styles.secondary} onClick={() => { assessmentRepository.save(refineBudget(draft)); router.push("/assessment"); }}>{budget.status === "known" ? "Change budget" : "Set a budget"}</button></div>
    {hasGuidance ? <>
      <CoolingResearch draft={draft} selectedId={view.selected?.id ?? null} onChoose={id => assessmentRepository.save(selectCoolingOption(draft, id, new Date().toISOString()))} />
      {view.options.some(option => option.id === "ac-replacement") && <ReplacementComparison draft={draft} profile={view.baseline.profile} storageNotice={notice} />}
      <details className={styles.optionalSection}><summary><span><strong>Understand your cooling costs</strong><small>Review your baseline, inputs and spending guide</small></span><span aria-hidden="true">⌄</span></summary><div className={styles.optionalBody}>
        {hasReportedAC(context.room.coolingEquipment) && (view.baseline.result?.amountAud.status === "known" || view.options.some(option => option.comparison.annualNetSavings.amountAud.status === "known")) && <FinancialCoach draft={draft} />}
        <details className={styles.inputDisclosure}><summary>Your cooling baseline & information to confirm</summary>{view.baseline.result?.amountAud.status === "known" ? <><p>{view.baseline.kind === "scenario" ? "What-if baseline" : "Measured-use baseline"}: {typeof view.baseline.result.amountAud.value === "number" ? formatMoney(view.baseline.result.amountAud.value) : "Range"} · {view.baseline.periodLabel}</p><p>{view.baseline.arithmetic}</p><ul>{view.baseline.inputRows.map(row => <li key={row.label}>{row.label}: {row.value} · {row.provenance}</li>)}</ul><p>This baseline does not establish what an improvement would save.</p></> : <><p>Add cooling-specific use and an electricity rate to calculate a baseline.</p><ul>{view.baseline.missing.map(item => <li key={item}>{item}</li>)}</ul></>}{view.gaps.length > 0 && <><h3>Room information to confirm</h3><ul>{view.gaps.map(gap => <li key={gap}>{gap}</li>)}</ul></>}<Link href="/room-baseline">Review room & calculation →</Link></details>
      </div></details>
      <details className={styles.optionalSection}><summary><span><strong>Explore a cooling scenario</strong><small>Try the experimental temperature & cost simulator</small></span><span aria-hidden="true">⌄</span></summary><div className={styles.optionalBody}><p>Explore a 24-hour heat-balance scenario for shading, insulation and night ventilation, using explicit assumptions. Results are experimental scenarios, with no annual savings or payback calculation.</p><Link href="/thermal-scenario">Open experimental simulator →</Link></div></details>
    </> : <div className={styles.empty}><div><span className={styles.emptyEyebrow}>LET’S START WITH YOUR ROOM</span><h2>A few details.<br />A clearer way forward.</h2><p>Tell us about your room and cooling use so we can identify improvements worth investigating.</p><Link href="/assessment" className={styles.emptyAction}>Complete my room profile <span aria-hidden="true">→</span></Link><small>Not sure about something? You can leave it unknown.</small></div><div className={styles.emptyScene}><RoomScene scene={assessmentScene(draft.answers, draft.sceneDetails)} /><p>Illustrative layout · built from your answers</p></div></div>}
    <section className={styles.knowledgeLink} aria-labelledby="simple-techniques-title"><div><h2 id="simple-techniques-title">Start with a simple change</h2><p>Explore {techniques.length} practical ways to use less energy, with steps, checks and government guidance.</p></div><Link href="/knowledge-base">Browse simple techniques →</Link></section>
    <div className={styles.notes}><Link href="/assessment">Refine my answers →</Link></div>
    {notice && <p role="status" className={styles.notice}>{notice}</p>}
    <footer className={styles.footer}><Link href="/heat-contributors">← Back</Link>{view.options.length > 0 ? <div><p role="status">{view.selected ? `${view.selected.title} selected as your next investigation.` : "Choose an investigation to continue."}</p><button className={styles.primary} disabled={!view.selected} onClick={() => { const destination = coolingOptionsDestination(assessmentRepository.getSnapshot().draft); if (destination) router.push(destination); }}>Continue to my cooling plan →</button></div> : <p role="status">{hasGuidance ? "Start with a technique above. You can refine your room answers whenever you learn more." : "Complete your room profile to explore next steps."}</p>}</footer>
  </> : <p className={styles.notice} role="status">Loading your room answers…</p>}</div>;
}
