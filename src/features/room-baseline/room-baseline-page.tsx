"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useSyncExternalStore } from "react";
import { BedroomCrossSection, type IllustrationCallout } from "@/components/illustrations/bedroom-cross-section";
import { assessmentRepository } from "@/features/assessment/repository";
import { confirmMeasuredScope, confirmRoomReview, factText, formatMoney, revokeMeasuredScope, roomBaseline, titleCase } from "./model";
import styles from "./room-baseline.module.css";

function DetailIcon({ kind }: { kind: "room" | "roof" | "sun" | "window" | "shade" | "insulation" | "cooling" | "budget" }) {
  return <svg viewBox="0 0 32 32" fill="none" aria-hidden="true" stroke={kind === "sun" ? "var(--color-heat-light)" : kind === "cooling" ? "var(--color-cooling)" : "var(--color-forest)"} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    {kind === "room" && <><path d="M4 14L16 4L28 14M7 12V28H25V12M13 28V19H19V28" /></>}
    {kind === "roof" && <><path d="M3 20L16 8L29 20H3ZM7 20V28M25 20V28" /><path d="M16 8V20" /></>}
    {kind === "sun" && <><circle cx="16" cy="16" r="7" fill="var(--color-heat-light)" /><path d="M16 1V5M16 27V31M1 16H5M27 16H31M5 5L8 8M24 24L27 27M5 27L8 24M24 8L27 5" /></>}
    {kind === "window" && <><path d="M5 4H27V28H5ZM16 4V28M20 15V18" /></>}
    {kind === "shade" && <><path d="M5 6H27L30 14H2ZM5 14V28M27 14V28M10 7L9 13M16 7V13M22 7L23 13" /></>}
    {kind === "insulation" && <><path d="M3 11L16 4L29 11L16 18ZM3 16L16 23L29 16M3 21L16 28L29 21" /></>}
    {kind === "cooling" && <><path d="M16 2V30M4 9L28 23M4 23L28 9M12 4L16 8L20 4M12 28L16 24L20 28M5 14L9 12L9 7M23 25L23 20L28 18M5 18L9 20L9 25M23 7L23 12L28 14" /></>}
    {kind === "budget" && <><rect x="4" y="8" width="24" height="19" rx="3" /><path d="M4 12H28M21 18H28M24 20H25M7 8V5H24" /></>}
  </svg>;
}
export function RoomBaselinePage() {
  const router = useRouter();
  const { draft, ready, notice } = useSyncExternalStore(assessmentRepository.subscribe, assessmentRepository.getSnapshot, assessmentRepository.getServerSnapshot);
  useEffect(() => { assessmentRepository.hydrate(); }, []);
  const baseline = roomBaseline(draft);
  const profile = baseline.profile;
  const windows = profile.windowSummary!;
  const heat = factText(profile.heatTiming, values => values.map(titleCase).join(", "));
  const position = factText(profile.position, value => value === "ground-floor" ? "Ground floor" : "Upper floor");
  const above = factText(profile.aboveRoom, value => ({ roof: "Roof above", "another-room": "Another room above", "another-dwelling": "Another dwelling above" })[value]);
  const orientation = factText(windows.orientations, values => values.map(titleCase).join(", "));
  const shade = factText(windows.externalShading, value => ({ all: "All relevant windows shaded", some: "Some external shade", none: "No external shade" })[value]);
  const insulation = factText(profile.insulation, value => value ? "Reported present" : "Reported absent");
  const cooling = factText(profile.cooling, value => value.equipment.length ? value.equipment.map(item => item === "fan" ? "Fan" : "Air conditioner").join(" + ") : "No cooling equipment");
  const usage = draft.answers.coolingUsage;
  const usageText = usage?.status === "known" ? String(usage.value) : baseline.noEquipment ? "Not applicable" : "Not sure";
  const rows = [
    { icon: "sun", label: "Hottest times", value: heat },
    { icon: "room", label: "Room position", value: position },
    { icon: "roof", label: "Above the room", value: above },
    { icon: "window", label: "Window directions", value: orientation },
    { icon: "shade", label: "External shade", value: shade },
    { icon: "insulation", label: "Insulation", value: insulation },
    { icon: "cooling", label: "Cooling", value: cooling, secondary: `Use · ${usageText}` },
    { icon: "budget", label: "Budget now", value: factText(profile.budgetAud, value => typeof value === "number" ? `Up to ${formatMoney(value)}` : `${formatMoney(value.min)}–${formatMoney(value.max)}`) },
  ] as const;
  const callouts: IllustrationCallout[] = [];
  if (profile.position.status === "known") callouts.push({ text: position, x: 95, y: 180, width: 155 });
  if (profile.aboveRoom.status === "known") callouts.push({ text: above, x: 560, y: 48, width: above.length > 15 ? 223 : 145, accent: "heat" });
  if (profile.heatTiming.status === "known") callouts.push({ text: profile.heatTiming.value.length === 1 ? `Hottest · ${heat}` : "Hottest times · Reported", x: 710, y: 275, width: 225, accent: "heat" });
  if (windows.orientations.status === "known") callouts.push({ text: windows.orientations.value.length === 1 ? `${orientation}-facing` : "Directions · Reported", x: 730, y: 410, width: 202 });
  if (windows.externalShading.status === "known") callouts.push({ text: windows.externalShading.value === "all" ? "External shade · Present" : shade, x: 710, y: 505, width: 225 });
  if (profile.insulation.status === "unknown") callouts.push({ text: "Insulation · Not sure", x: 275, y: 112, width: 185 });
  const result = baseline.result;
  const amount = result?.amountAud;
  const available = amount?.status === "known" && typeof amount.value === "number";
  return <div className={styles.page}>
    <header className={styles.header}>
      <Link href="/" className={styles.brand}><svg viewBox="0 0 32 32" fill="none" aria-hidden="true"><rect x="2" y="2" width="28" height="28" rx="4" fill="var(--color-heat-light)" stroke="var(--color-forest)" strokeWidth="2" /><path d="M8 25C9 9 19 15 25 7C26 20 19 25 12 23M7 26L21 13M12 21L13 15M16 18L22 18" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg><span>Home Heat Planner</span></Link>
      <nav aria-label="Main navigation" className={styles.navigation}><Link href="/cooling-plan">My Plan</Link><Link href="/#how-it-works">How it works</Link><Link href="/#help">Help</Link></nav>
    </header>
    {ready ? <>
      <div className={styles.layout}>
        <section className={styles.room} aria-labelledby="room-title">
          <div className={styles.progress}><span>Your room · Review</span><div aria-hidden="true"><i /><i /><i /><i /></div></div>
          <h1 id="room-title">Your room</h1>
          <p className={styles.intro}>Here’s what we have so far. You can edit anything.</p>
          <figure className={styles.illustration}><BedroomCrossSection callouts={callouts} /><figcaption>Illustrative architecture · annotations reflect your answers, not a simulation</figcaption></figure>
        </section>
        <section className={styles.details} aria-labelledby="details-title">
          <div className={styles.detailsHeading}><h2 id="details-title">Room details</h2><Link href="/assessment">Edit answers</Link></div>
          <dl className={styles.detailRows}>{rows.map(row => <div key={row.label} className={styles.detailRow}>
            <dt><DetailIcon kind={row.icon} /><span>{row.label}</span></dt><dd className={row.value === "Not sure" ? styles.unknown : ""}>{row.value}{"secondary" in row && <small>{row.secondary}</small>}</dd>
          </div>)}</dl>
          <section className={`${styles.baseline} ${available ? "" : styles.unavailable}`} aria-labelledby="baseline-title">
            <p className={styles.resultType}>{available ? baseline.kind === "measured" ? "Measured baseline · user-reported data" : "What-if scenario" : "Insufficient information"}</p>
            <h2 id="baseline-title">{available ? baseline.kind === "measured" ? "Current cooling electricity cost" : "Estimated cooling cost for your stated scenario" : "Cooling cost not available yet"}</h2>
            {available && amount.status === "known" && typeof amount.value === "number" ? <><p className={styles.amount}>{formatMoney(amount.value)} <span>AUD</span></p><p className={styles.period}>{baseline.periodLabel}</p></> : <>{baseline.noEquipment ? <p>No cooling equipment was reported. We haven’t assumed an existing cooling bill.</p> : <><p>To calculate this, we still need:</p><ul>{baseline.missing.map(item => <li key={item}>{item}</li>)}</ul></>}<Link href="/assessment">Add or edit cooling details →</Link></>}
            {baseline.kind === "measured" && <div className={styles.scopeConfirmation}>
              {baseline.scopeConfirmationAvailable && <p>Your measurement record: {draft.answers.energyScope?.status === "known" ? String(draft.answers.energyScope.value) : "Not sure"}</p>}
              {baseline.scopeConfirmationAvailable ? <label><input type="checkbox" checked={baseline.scopeConfirmed} onChange={event => assessmentRepository.save(event.target.checked ? confirmMeasuredScope(draft, new Date().toISOString()) : revokeMeasuredScope(draft))} /><span>I confirm this measurement covers only cooling equipment serving this bedroom, not a whole-home bill or other rooms.</span></label> : <p>Bedroom-only measurement scope is not confirmed. Shared or unknown system scope needs attribution evidence.</p>}
            </div>}
          </section>
          <details className={styles.calculation}><summary>See calculation <span aria-hidden="true">⌄</span></summary>
            <p>{baseline.kind === "measured" ? "Cooling-specific measured energy × flat electricity usage rate." : baseline.kind === "scenario" ? "Assumed average electrical input × operating hours per cooling day × cooling days × flat electricity usage rate." : "Choose measured cooling-specific energy or enter an explicit electrical-input scenario in your assessment."}</p>
            {baseline.arithmetic && <p className={styles.arithmetic}>{baseline.arithmetic}</p>}
            <dl>{baseline.inputRows.map(row => <div key={row.label}><dt>{row.label}</dt><dd>{row.value}<small>{row.provenance}{row.recordedAt && <time dateTime={row.recordedAt}> · {new Date(row.recordedAt).toLocaleDateString("en-AU", { timeZone: "UTC" })}</time>}</small></dd></div>)}</dl>
            {baseline.inputs && <p>Period: {baseline.periodLabel}</p>}
            <p>{baseline.kind === "scenario" ? "These are your explicit scenario assumptions. Electrical input is not cooling capacity. This is the cost of the supplied equipment scenario; actual bedroom consumption has not been established." : "Measured inputs and measurement scope are reported by you; they have not been independently verified."}</p>
            <p>Flat usage charges only. Excludes fixed supply charges, time-of-use tariffs and solar opportunity costs. Amounts are rounded to the nearest cent. No annualisation, improvement savings or cooling benefit is calculated.</p>
          </details>
        </section>
      </div>
      {notice && <p className={styles.notice} role="status">{notice}</p>}
      <footer className={styles.footer}><div className={styles.footerIntro}><Link href="/assessment" className={styles.back}>← Edit room</Link><p>Continue to confirm these reported answers. Unknowns stay unknown.</p></div><button className={styles.primary} onClick={() => { assessmentRepository.save(confirmRoomReview(draft, new Date().toISOString())); router.push("/heat-contributors"); }}>See what’s heating your room <span aria-hidden="true">→</span></button></footer>
    </> : <p className={styles.loading} role="status">Loading your room answers…</p>}
  </div>;
}
