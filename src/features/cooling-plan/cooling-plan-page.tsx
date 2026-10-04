"use client";

import Link from "next/link";
import { useEffect, useState, useSyncExternalStore } from "react";
import { JourneyHeader } from "@/components/layout/journey-header";
import { plannerClient as assessmentRepository } from "@/services/planner";
import { factText, formatMoney } from "@/features/room-baseline/model";
import type { CheckInChoice, CoolingPlanDraft } from "@/domain/cooling-plan";
import { canSavePlan, chooseCheckIn, coolingPlan, localDate, planDestination, saveCoolingPlan, togglePlanStep, validCustomDate } from "./model";
import { coolingPlanService } from "./repository";
import { PlanIllustration } from "./plan-illustration";
import styles from "./cooling-plan.module.css";
import { downloadCalendar } from "./calendar";
import { financialSummary } from "../cooling-options/financial-summary";
import { HeatwaveReadyGuide } from "./heatwave-ready-guide";
import { HistoryReview } from "../follow-up/history-review";

function FinancialIcon({ kind }: { kind: "cost" | "savings" | "payback" }) {
  return <svg viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{kind === "cost" ? <><path d="M3 18L18 3H28V13L13 28ZM22 8H23" /></> : kind === "savings" ? <><ellipse cx="16" cy="6" rx="10" ry="4" /><path d="M6 6V25C6 30 26 30 26 25V6M6 12C6 17 26 17 26 12M6 18C6 23 26 23 26 18" /></> : <><path d="M4 28H29M7 24V18M15 24V11M23 24V4" /></>}</svg>;
}
export function CoolingPlanPage() {
  const { draft, ready, notice } = useSyncExternalStore(assessmentRepository.subscribe, assessmentRepository.getSnapshot, assessmentRepository.getServerSnapshot);
  const [now] = useState(() => new Date().toISOString());
  const [rawDate, setRawDate] = useState<string | null>(null);
  const [saveNotice, setSaveNotice] = useState<string | null>(null);
  useEffect(() => { assessmentRepository.hydrate(); }, []);
  const view = coolingPlan(draft, now);
  const { option, plan } = view;
  const persist = (next: CoolingPlanDraft) => { coolingPlanService.persist(next); setSaveNotice(null); };
  const today = localDate(new Date().toISOString());
  const custom = plan?.checkInChoice.status === "known" && plan.checkInChoice.value === "custom";
  const invalidDate = custom && rawDate !== null && !validCustomDate(rawDate, today);
  const saved = plan?.savedAt.status === "known";
  const financial = option ? financialSummary(option.comparison, option.recommendation.upfrontCostAud) : null;
  const nextStep = view.steps.find((_, index) => !plan?.checklist[index]?.completed);
  const completedSteps = plan?.checklist.filter(step => step.completed).length ?? 0;
  return <div className={styles.page}><JourneyHeader />{ready ? plan ? <>
    <div className={styles.layout}>
      <section className={styles.room} aria-labelledby="plan-title"><div className={styles.progress}><span>Your plan · Next step</span><div aria-hidden="true"><i /><i /><i /><i /></div></div>
        <h1 id="plan-title">My room plan</h1><h2 className={styles.action}>{plan.selectedActionLabel}</h2><p className={styles.intro}>Try your selected actions, check how the room feels, and investigate improvements at your pace.</p>
        <div className={styles.roomStage}>
          <PlanIllustration option={option} draft={draft} />
          <aside className={styles.planOverview} aria-labelledby="plan-overview-title">
            <p className={styles.overviewEyebrow}>YOUR SELECTED ACTIONS</p>
            <h2 id="plan-overview-title">Plan at a glance</h2>
            <div className={styles.nextStepPreview}>
              <p className={styles.overviewEyebrow}>NEXT STEP</p>
              <h3>{nextStep?.title ?? "Checklist completed"}</h3>
              <p>{nextStep?.detail ?? "Your checklist progress is recorded. Keep your completion records for your check-in."}</p>
              <a href="#steps-title">{completedSteps} of {view.steps.length} steps checked <span aria-hidden="true">→</span></a>
            </div>
            {option ? <><p className={styles.overviewEyebrow}>SUPPORTING COST INFORMATION</p>
            <dl className={styles.financials}><div><dt><FinancialIcon kind="cost" />Upfront cost</dt><dd>{factText(plan.upfrontCostAud, value => typeof value === "number" ? formatMoney(value) : `${formatMoney(value.min)}–${formatMoney(value.max)}`) === "Not sure" ? "Quote needed" : factText(plan.upfrontCostAud, value => typeof value === "number" ? formatMoney(value) : `${formatMoney(value.min)}–${formatMoney(value.max)}`)}<small>{option.recommendation.costScope.status === "known" ? option.recommendation.costScope.value : "Scope & price not established"}</small></dd></div>
          <div><dt><FinancialIcon kind="savings" />Potential savings</dt><dd>{financial?.savings}<small>{option.id === "ac-replacement" ? "Standard annual label conditions" : "No action-specific savings method"}</small></dd></div>
          <div><dt><FinancialIcon kind="payback" />Simple payback</dt><dd>{financial?.payback}<small>{financial?.reason}</small></dd></div></dl></> : <p>Start with the equipment and habits you already have. Costs and savings are not quantified for these actions; record any actual spending at check-in.</p>}
          </aside>
        </div>
        {option ? <details className={styles.evidence}><summary>See assumptions and evidence <span aria-hidden="true">⌄</span></summary><p>Financial result: {({ "supported-estimate": "Supported estimate", "what-if": "What-if scenario", "insufficient-evidence": "Insufficient evidence" })[plan.financialStatus]}. Review the supplied inputs and conditions before spending. Selection is not an installation or outcome guarantee.</p><p>{option.contributor.explanation}</p><dl>{option.contributor.reasons.map(reason => <div key={reason.fieldId}><dt>{reason.label}</dt><dd>{reason.value} · {reason.fact.status === "known" ? "Reported by you" : "Unknown"}</dd></div>)}</dl><ul>{option.recommendation.requiredChecks.map(check => <li key={check}>{check}</li>)}</ul>{option.recommendation.comfortTradeOffs.map(item => <p key={item}>{item}</p>)}<p>{option.comparison.annualNetSavings.assumptions.map(a => a.description).join(" ") || "General guidance supports investigation, not personalised numerical savings."}</p>{plan.evidence.map(source => <div className={styles.source} key={source.id}><a href={source.url} target="_blank" rel="noreferrer">{source.title} ↗</a><p>{source.excerpt}</p><small>Reviewed {source.reviewedAt} · {source.contentVersion}</small></div>)}
          {view.baseline.result?.amountAud.status === "known" && <div className={styles.baseline}><h3>{view.baseline.kind === "scenario" ? "Separate what-if cooling baseline" : "Separate measured-use cooling baseline"}</h3><p>{typeof view.baseline.result.amountAud.value === "number" ? formatMoney(view.baseline.result.amountAud.value) : "Range"} · {view.baseline.periodLabel}</p><p>{view.baseline.arithmetic}</p><p>This does not establish intervention savings.</p><Link href="/room-baseline">Review the baseline inputs →</Link></div>}
        </details> : <details className={styles.evidence}><summary>Why these actions may help <span aria-hidden="true">⌄</span></summary><p>These are practical steps to reduce unnecessary heat or energy use. No personal savings or temperature reduction is predicted.</p>{plan.evidence.map(source => <p key={source.id}><a href={source.url} target="_blank" rel="noreferrer">{source.title} ↗</a> · {source.excerpt}</p>)}</details>}
      </section>
      <HeatwaveReadyGuide draft={draft} />
      <section className={styles.nextSteps} aria-labelledby="steps-title"><div><h2 id="steps-title">Your action checklist</h2><p className={styles.sectionIntro}>Try the simple changes you selected, then work through any investigation.</p>
        <ol className={styles.checklist}>{view.steps.map((step, index) => <li key={step.id} className={plan.checklist[index]!.completed ? styles.completed : ""}><label><input type="checkbox" checked={plan.checklist[index]!.completed} aria-label={step.title} onChange={event => persist(togglePlanStep(plan, step.id, event.target.checked, new Date().toISOString()))} /><span className={styles.stepNumber} aria-hidden="true">{plan.checklist[index]!.completed ? "✓" : String(index + 1).padStart(2, "0")}</span><span><strong>{step.title}</strong><span>{step.detail}</span></span></label></li>)}</ol>
        </div><div className={styles.checkIn}><h2>Check in</h2><p className={styles.sectionIntro}>Choose when to review how it’s going. Seven days is a suggestion.</p><fieldset className={styles.checkInChoices}><legend className="sr-only">Check-in timing</legend>{([{ value: "7-days", label: "7 days" }, { value: "14-days", label: "14 days" }, { value: "custom", label: "Pick a date" }] as const).map(choice => <label key={choice.value} className={plan.checkInChoice.status === "known" && plan.checkInChoice.value === choice.value ? styles.chosen : ""}><input type="radio" name="check-in" value={choice.value} checked={plan.checkInChoice.status === "known" && plan.checkInChoice.value === choice.value} onChange={() => { setRawDate(null); persist(chooseCheckIn(plan, choice.value as CheckInChoice, new Date().toISOString())); }} /><span>{choice.label}</span><span className={styles.selectionMark} aria-hidden="true">{plan.checkInChoice.status === "known" && plan.checkInChoice.value === choice.value ? "✓" : ""}</span></label>)}</fieldset>
          {custom && <div className={styles.customDate}><label htmlFor="check-in-date">Check-in date</label><input id="check-in-date" type="date" min={today} value={rawDate ?? (plan.checkInDate.status === "known" ? plan.checkInDate.value : "")} aria-invalid={invalidDate} aria-describedby="date-error" onInput={event => { const value = event.currentTarget.value; setRawDate(value); persist(chooseCheckIn(plan, "custom", new Date().toISOString(), validCustomDate(value, today) ? value : undefined)); }} /><p id="date-error" role="status">{invalidDate ? "Choose today or a future valid date." : ""}</p></div>}
          <div className={styles.checkInSummary}><p>{plan.checkInDate.status === "known" ? <>Review on <time dateTime={plan.checkInDate.value}>{new Date(`${plan.checkInDate.value}T12:00:00`).toLocaleDateString("en-AU", { day: "numeric", month: "long", year: "numeric" })}</time>.</> : "No check-in date chosen. You can save without one."}</p>{plan.checkInChoice.status === "known" && <button onClick={() => { setRawDate(null); persist(chooseCheckIn(plan, null, new Date().toISOString())); }}>Clear check-in date</button>}</div>
          <div className={styles.saveActions}>{saved && plan.checkInDate.status === "known" && <button className={styles.secondary} onClick={() => downloadCalendar(plan)}>Add to calendar ↓</button>}<button className={styles.primary} disabled={!canSavePlan(plan) || invalidDate} onClick={() => { const persisted = coolingPlanService.persist(saveCoolingPlan(plan, new Date().toISOString())); setSaveNotice(persisted ? "Plan saved in this browser." : "Plan kept in this tab; browser saving is unavailable. Retry saving before leaving."); }}>Save my plan <span aria-hidden="true">→</span></button>{saved && !notice && planDestination(plan) && <Link className={styles.secondary} href="/follow-up">Continue to check-in →</Link>}</div>
          <p className={styles.saveStatus} role="status">{saveNotice ?? (saved ? "Your saved plan is available for check-in." : "Save your plan when you’re ready.")}</p><p className={styles.localNote}>Saved in this browser. The check-in appears when you return; no external reminder is sent by this app. Import the downloaded event for a calendar alert; changing or clearing this date does not change an event already imported into your calendar.</p>
        </div>
      </section>
    </div>{view.invalidStoredPlan && <p className={styles.notice} role="status">Your selection or answers changed, or the previous plan could not be read. Review and save this current plan.</p>}{notice && <p className={styles.notice} role="status">{notice}</p>}
    <HistoryReview draft={draft} />
    <footer className={styles.footer}><Link href="/cooling-options">← Back</Link><span>Checklist completion records your progress, not an installation outcome.</span></footer>
  </> : <section className={styles.empty}><h1>My room plan</h1><p>Choose a simple action or an investigation to create your next steps.</p><p>If your answers changed, select an option again. Earlier saved estimates remain in your history.</p><HistoryReview draft={draft} /><Link className={styles.primary} href="/cooling-options">Explore room improvements →</Link>{notice && <p role="status">{notice}</p>}</section> : <p role="status" className={styles.notice}>Loading your room plan…</p>}</div>;
}
