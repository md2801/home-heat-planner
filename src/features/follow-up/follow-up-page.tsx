"use client";

import Link from "next/link";
import { useEffect, useState, useSyncExternalStore } from "react";
import { JourneyHeader } from "@/components/layout/journey-header";
import { plannerClient as assessmentRepository } from "@/services/planner";
import { PlanIllustration } from "@/features/cooling-plan/plan-illustration";
import { formatMoney } from "@/features/room-baseline/model";
import type { FollowUpCheckIn } from "@/domain/follow-up";
import { changeStatus, confirmComparableUsage, followUp, numericInput, observedUsage, saveCheckIn, statusChoices, updateNote, updateNumber, type NumericField, barrierSteps, updateFollowUpDetail } from "./model";
import { followUpService } from "./repository";
import styles from "./follow-up.module.css";
import { HistoryReview } from "./history-review";
import { financialText } from "../cooling-options/financial-summary";
import type { Barrier } from "../../domain/follow-up";

import type { AssessmentDraft } from "../assessment/state";

type View = ReturnType<typeof followUp>;
function CheckInEditor({ view, initial, draft }: { view: View; initial: FollowUpCheckIn; draft: AssessmentDraft }) {
  const [checkIn, setCheckIn] = useState(initial);
  const [raw, setRaw] = useState({ actualCostAud: initial.actualCostAud.status === "known" ? String(initial.actualCostAud.value) : "", currentHoursPerDay: initial.currentHoursPerDay.status === "known" ? String(initial.currentHoursPerDay.value) : "", laterCoolingKwh: initial.laterCoolingKwh?.status === "known" ? String(initial.laterCoolingKwh.value) : "", laterTariff: initial.laterTariff?.status === "known" ? String(initial.laterTariff.value) : "" });
  const [noteRaw, setNoteRaw] = useState(initial.note.status === "known" ? initial.note.value : "");
  const [confirmation, setConfirmation] = useState<string | null>(null);
  const status = checkIn.status.status === "known" ? checkIn.status.value : null;
  const completed = status === "completed";
  const observed = observedUsage(checkIn);
  const invalid = (Object.keys(raw) as (keyof typeof raw)[]).some(field => numericInput(field, raw[field]).error !== null);
  const change = (next: FollowUpCheckIn) => { setCheckIn(next); setConfirmation(null); };
  const now = () => new Date().toISOString();
  const numberField = (field: Exclude<NumericField, "comfortRating">, label: string, unit: string) => {
    const error = numericInput(field, raw[field]).error;
    return <div className={styles.fieldRow}><label htmlFor={field}>{label}<small>{field === "actualCostAud" ? "Installed or spent · AUD · optional" : "Same cooling equipment / routine · optional"}</small></label><div><div className={styles.numberInput}><span aria-hidden="true">{field === "actualCostAud" ? "$" : ""}</span><input id={field} type="text" inputMode="decimal" value={raw[field]} maxLength={16} aria-invalid={!!error} aria-describedby={`${field}-error`} onInput={event => { const text = event.currentTarget.value; setRaw(previous => ({ ...previous, [field]: text })); change(updateNumber(checkIn, field, numericInput(field, text).value, now())); }} /><span>{unit}</span></div>{error && <p id={`${field}-error`} className={styles.error} role="status">{error}</p>}</div></div>;
  };
  return <div className={styles.layout}>
    <section className={styles.inputSection} aria-labelledby="follow-up-title">
      <h1 id="follow-up-title">Is your room more comfortable?</h1>
      <p className={styles.action}>Your plan · {checkIn.actionLabel}</p>
      {view.due && <p className={styles.due}>Your chosen check-in date has arrived.</p>}
      <form onSubmit={event => { event.preventDefault(); if (!status || invalid) return; const saved = saveCheckIn(checkIn, now()); const persisted = followUpService.save(saved); setCheckIn(saved); setConfirmation(persisted ? "Check-in saved in this browser." : "Check-in kept in this tab. Browser saving is unavailable; retry before leaving."); }}>
        <fieldset className={styles.statusChoices}><legend className="sr-only">How is your plan going?</legend>{statusChoices.map(choice => <label key={choice.value} className={status === choice.value ? styles.selected : ""}><input type="radio" name="follow-up-status" checked={status === choice.value} value={choice.value} onChange={() => { change(changeStatus(checkIn, choice.value, now())); if (choice.value !== status) { setRaw({ actualCostAud: "", currentHoursPerDay: "", laterCoolingKwh: "", laterTariff: "" }); setNoteRaw(""); } }} /><span className={styles.statusIcon} aria-hidden="true">{status === choice.value ? "✓" : choice.icon}</span><span>{choice.label}</span></label>)}</fieldset>
        {status && <section className={styles.details} aria-labelledby="details-title"><h2 id="details-title">{completed ? "What changed?" : status === "started" ? "How is it going?" : status === "stuck" ? "What’s getting in the way?" : "Take it at your pace"}</h2>
          {completed ? <>
            <p className={styles.detailHint}>Review comfort, cooling use and spending together. You can also note which Heatwave-Ready actions you tried. Lower bills alone do not establish improved comfort or lower emissions. Record what you know. Completing an investigation doesn’t mean anything was installed. Leave details blank if they don’t apply.</p>
            <label>Completion date (optional)<input className={styles.observationInput} type="date" max={new Date().toLocaleDateString("en-CA")} value={checkIn.completionDate?.status === "known" ? checkIn.completionDate.value : ""} onInput={event => { try { change(updateFollowUpDetail(checkIn, "completionDate", event.currentTarget.value, now())); } catch { setConfirmation("Choose a valid date no later than today."); } }} /></label>
            {numberField("actualCostAud", "Actual cost / spend", "")}
            {numberField("currentHoursPerDay", "Cooling use now", "hrs/day")}{numberField("laterCoolingKwh", "Measured cooling energy now", "kWh")}{numberField("laterTariff", "Electricity usage rate now", "AUD/kWh")}<label>Measurement period, equipment scope and changed weather/routine (optional)<input className={styles.observationInput} maxLength={500} value={checkIn.usagePeriod?.status === "known" ? checkIn.usagePeriod.value : ""} onChange={event => change(updateFollowUpDetail(checkIn, "usagePeriod", event.target.value, now()))} /></label>
            <div className={styles.fieldRow}><div id="comfort-label">Comfort now<small>1 · very uncomfortable &nbsp; 5 · very comfortable</small></div><fieldset className={styles.rating} aria-labelledby="comfort-label"><legend className="sr-only">Comfort from 1 to 5</legend>{([1, 2, 3, 4, 5] as const).map(value => <label key={value} className={checkIn.comfortRating.status === "known" && value <= checkIn.comfortRating.value ? styles.filled : ""}><input type="radio" name="comfort" checked={checkIn.comfortRating.status === "known" && checkIn.comfortRating.value === value} onChange={() => change(updateNumber(checkIn, "comfortRating", value, now()))} /><span>{value}</span></label>)}<strong>{checkIn.comfortRating.status === "known" ? `${checkIn.comfortRating.value} / 5` : "Not recorded"}</strong></fieldset></div>
            <label>Time of comfort observation<select className={styles.observationInput} value={checkIn.comfortTime?.status === "known" ? checkIn.comfortTime.value : ""} onChange={event => change(updateFollowUpDetail(checkIn, "comfortTime", event.target.value, now()))}><option value="">Not recorded</option>{["morning", "afternoon", "evening", "overnight"].map(time => <option key={time} value={time}>{time}</option>)}</select></label>{checkIn.comfortRating.status === "known" && <button type="button" className={styles.clear} onClick={() => change(updateNumber(checkIn, "comfortRating", null, now()))}>Clear comfort rating</button>}
            {checkIn.earlierHoursPerDay.status === "known" && <label className={styles.comparable}><input type="checkbox" checked={checkIn.comparableUsageConfirmed.status === "known" && checkIn.comparableUsageConfirmed.value} onChange={event => change(confirmComparableUsage(checkIn, event.target.checked, now()))} /><span>My earlier {checkIn.earlierHoursPerDay.value} hrs/day describes actual use of the same cooling equipment over comparable cooling days.<small>Originally supplied as a scenario assumption. Confirm only if it also reflects your actual earlier use.</small></span></label>}
          </> : status === "not-started" ? <p className={styles.detailHint}>Your plan is still here when you’re ready. Nothing is marked completed.</p> : <p className={styles.detailHint}>{status === "stuck" ? "Record the barrier: cost, permission, arranging work, time or uncertainty. You can return to your plan and choose a smaller investigation step or change your check-in date." : "A short progress note is enough. No installation or outcome is assumed."}</p>}
          {(status === "stuck" || status === "deferred") && <div><label>What is the main barrier?<select className={styles.observationInput} value={checkIn.barrier?.status === "known" ? checkIn.barrier.value : ""} onChange={event => change(updateFollowUpDetail(checkIn, "barrier", event.target.value, now()))}><option value="">Not sure</option>{Object.keys(barrierSteps).map(barrier => <option key={barrier} value={barrier}>{barrier.replaceAll("-", " ")}</option>)}</select></label>{checkIn.barrier?.status === "known" && <p>{barrierSteps[checkIn.barrier.value as Barrier]}</p>}<Link href="/cooling-plan">Choose a smaller checklist step or change your date →</Link> · <Link href="/cooling-options">Revisit budget and options →</Link></div>}
          {status !== "not-started" && <div className={styles.note}><label htmlFor="check-in-note">{status === "stuck" ? "What would help you move forward?" : "A short note"}<span> · optional</span></label><textarea id="check-in-note" maxLength={500} rows={2} value={noteRaw} onChange={event => { setNoteRaw(event.target.value); change(updateNote(checkIn, event.target.value, now())); }} /><small>Up to 500 characters. Changing status clears details that no longer apply.</small></div>}
        </section>}
        <button className={styles.primary} type="submit" disabled={!status || invalid}>Save update</button>
        <p className={styles.saveStatus} role="status">{confirmation ?? (checkIn.savedAt.status === "known" ? "Your saved check-in is available here." : "Updates are saved when you choose Save update.")}</p>
      </form>
    </section>
    <aside className={styles.review} aria-labelledby="observed-title">
      <div className={styles.illustration}>{view.option && <PlanIllustration option={view.option} draft={draft} />}</div>
      <section className={styles.observed}><div className={styles.observedHeading}><h2 id="observed-title">Observed difference</h2>{observed && <span>{observed.difference > 0 ? "+" : ""}{observed.difference} hrs/day<br /><small>Self-reported usage change</small></span>}</div>
        <div className={styles.beforeNow}><div><h3>Before</h3><p className={styles.metric}>{observed ? <>{observed.before}<small> hrs/day</small></> : "Not comparable yet"}</p><p className={styles.metricLabel}>Cooling use {observed ? "· confirmed at check-in" : "· no confirmed comparable record"}</p><p className={styles.unknown}>Comfort · {checkIn.earlierComfort?.status === "known" ? `${checkIn.earlierComfort.value} / 5` : "Not recorded"}{checkIn.earlierComfortTime?.status === "known" ? ` · ${checkIn.earlierComfortTime.value}` : ""}</p></div><div><h3>Now</h3><p className={styles.metric}>{completed && checkIn.currentHoursPerDay.status === "known" ? <>{checkIn.currentHoursPerDay.value}<small> hrs/day</small></> : "Not recorded"}</p><p className={styles.metricLabel}>Cooling use · user-reported</p><p className={styles.comfortNow}>{completed && checkIn.comfortRating.status === "known" ? <>{checkIn.comfortRating.value}<small> / 5</small></> : "Comfort · Not recorded"}</p></div></div>
        {!observed && <p className={styles.comparisonNote}>A before/now comparison is not available yet. It needs supplied hours for both periods and confirmation of comparable actual use. Compare comfort only when both ratings describe the same time of day and comparable cooling conditions.</p>}
        {checkIn.earlierHoursPerDay.status === "known" && !observed && <p className={styles.comparisonNote}>Earlier scenario assumption: {checkIn.earlierHoursPerDay.value} hrs/day. This is not automatically an observed baseline.</p>}
        <div className={styles.cost}><div><span>Earlier cost estimate</span><strong>{view.plan ? financialText(view.plan.upfrontCostAud) : "Not established"}</strong></div><div><span>Actual / spend · user-reported</span><strong>{completed && checkIn.actualCostAud.status === "known" ? formatMoney(checkIn.actualCostAud.value) : "Not recorded"}</strong></div></div>
        <p className={styles.comparisonNote}>Later energy: {checkIn.laterCoolingKwh?.status === "known" ? `${checkIn.laterCoolingKwh.value} kWh` : "Not recorded"} · {checkIn.usagePeriod?.status === "known" ? checkIn.usagePeriod.value : "Period/scope not recorded"}. Comfort is {checkIn.earlierComfortTime?.status === "known" && checkIn.comfortTime?.status === "known" && checkIn.earlierComfortTime.value === checkIn.comfortTime.value ? "at the same reported time of day" : "not established as comparable in time"}.</p><p className={styles.disclaimer}>Weather, behaviour and other factors may also affect the change. These observations do not prove that your selected action caused it.</p><p className={styles.comparisonNote}>No intervention savings or payback is calculated from this check-in.</p>
      </section>
    </aside>
  </div>;
}
export function FollowUpPage() {
  const { draft, ready, notice } = useSyncExternalStore(assessmentRepository.subscribe, assessmentRepository.getSnapshot, assessmentRepository.getServerSnapshot);
  const [now] = useState(() => new Date().toISOString());
  useEffect(() => { assessmentRepository.hydrate(); }, []);
  const view = followUp(draft, now);
  return <div className={styles.page}><JourneyHeader />{ready ? view.plan && view.checkIn ? <><CheckInEditor key={view.checkIn.planSignature} view={view} initial={view.checkIn} draft={draft} />{view.invalidStoredCheckIn && <p className={styles.notice} role="status">The earlier check-in no longer matches this saved plan or could not be read. Start a new update; no earlier results are assumed.</p>}</> : <section className={styles.empty}><h1>Is your room more comfortable?</h1><p>Save a room plan first so your check-in belongs to the action you chose.</p><Link className={styles.primary} href="/cooling-plan">Return to my room plan →</Link></section> : <p className={styles.notice} role="status">Loading your saved plan…</p>}{notice && <p className={styles.notice} role="status">{notice}</p>}<HistoryReview draft={draft} /><footer className={styles.footer}><Link href="/cooling-plan">← Back to my room plan</Link><span>Saved locally in this browser.</span></footer></div>;
}
