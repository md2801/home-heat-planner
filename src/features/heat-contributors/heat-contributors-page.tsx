"use client";

import Link from "next/link";
import { useEffect, useSyncExternalStore } from "react";
import { JourneyHeader } from "@/components/layout/journey-header";
import { JourneyRoom } from "@/features/room-scene/journey-room";
import { plannerClient as assessmentRepository } from "@/services/planner";
import { assessContributors, type ContributorId } from "./model";
import { contributorEvidence } from "./evidence";
import styles from "./heat-contributors.module.css";

function AreaIcon({ kind }: { kind: ContributorId | "coverings" | "ventilation" | "cooling" | "book" }) {
  return <svg viewBox="0 0 48 48" fill="none" aria-hidden="true" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    {kind === "window-solar" ? <><path d="M6 9H42L46 20H2ZM9 20V44M39 20V44M15 11L13 19M24 11V19M33 11L35 19M14 38H34M29 28L20 36" /><path d="M14 23V37H34V23" /><circle cx="31" cy="29" r="3" /></> : kind === "roof-ceiling" ? <><path d="M3 24L24 7L45 24H3ZM7 24V43H41V24M7 33H41M18 24V33M30 33V43" /><path d="M3 17L24 1L45 17" strokeDasharray="3 5" /></> : kind === "coverings" ? <><path d="M7 4H41V43H7ZM24 4V43M28 22V27M11 8V38M37 8V38" /></> : kind === "ventilation-limit" || kind === "ventilation" ? <><circle cx="24" cy="24" r="4" /><path d="M23 20C10 9 20 2 27 8C30 11 30 16 26 20M28 24C40 14 46 25 40 30C36 33 32 31 28 27M24 28C30 43 16 44 13 37C12 33 17 29 21 27M20 25C6 31 3 19 10 15C15 14 17 19 20 22M24 32V44M17 45H31" /></> : kind === "cooling" ? <><path d="M5 14H32C40 14 40 4 33 4C28 4 28 9 29 10M5 23H39C47 23 47 13 41 13M5 32H27C35 32 35 42 28 42C24 42 24 38 25 36M5 40H16" /></> : <><path d="M24 10C18 4 8 4 3 7V40C10 37 18 37 24 42C30 37 38 37 45 40V7C40 4 30 4 24 10ZM24 10V42M8 13H18M8 20H18M8 27H18M30 13H40M30 20H40M30 27H40" /></>}
  </svg>;
}
export function HeatContributorsPage() {
  const { draft, ready, notice } = useSyncExternalStore(assessmentRepository.subscribe, assessmentRepository.getSnapshot, assessmentRepository.getServerSnapshot);
  useEffect(() => { assessmentRepository.hydrate(); }, []);
  const assessment = assessContributors(draft);
  return <div className={styles.page}>
    <JourneyHeader />
    {ready ? <>
      <div className={styles.layout}>
        <section className={styles.room} aria-labelledby="contributors-title">
          <div className={styles.progress}><span>Analysis · Your room</span><div aria-hidden="true"><i /><i /><i /><i /></div></div>
          <h1 id="contributors-title">What’s heating your room?</h1>
          <p className={styles.intro}>{assessment.contributors.length ? "Based on your answers, here’s what’s worth investigating." : "We need a little more information to identify plausible contributors."}</p>
          <figure className={styles.illustration}><JourneyRoom draft={draft} /><figcaption>Your reported room · layout illustrative, not a thermal simulation</figcaption></figure>
        </section>
        <aside className={styles.opportunities} aria-labelledby="opportunities-title">
          <h2 id="opportunities-title">Your opportunities</h2>
          {assessment.contributors.length ? <div className={styles.contributors}>{assessment.contributors.map(contributor => <details className={styles.contributor} key={contributor.id}>
            <summary><span className={styles.areaIcon}><AreaIcon kind={contributor.id} /></span><span className={styles.summaryText}><span className={styles.status}>{contributor.status === "likely-contributor" ? "Likely contributor" : "Worth checking"}</span><strong>{contributor.opportunity}</strong><span>{contributor.summary}</span></span><span className={styles.arrow} aria-hidden="true">›</span></summary>
            <div className={styles.explanation}><h3>{contributor.title}</h3><p>{contributor.explanation}</p><p>{contributor.nextStep}</p><p className={styles.reasonLabel}>Your supplied facts</p><dl>{contributor.reasons.map(reason => <div key={reason.fieldId}><dt>{reason.label}</dt><dd>{reason.value}{reason.fact.status === "known" && <small>Reported by you</small>}</dd></div>)}</dl><ul>{contributor.unknowns.map(item => <li key={item}>{item}</li>)}</ul></div>
          </details>)}</div> : <div className={styles.empty}><h3>No contributor established yet</h3><p>Your answers don’t establish a window, roof or opening issue. That doesn’t rule out other causes.</p><p>You can refine your answers or continue to compare options with the information you have.</p></div>}
          <div className={styles.other}><h3>Other factors</h3><div className={styles.context}>{assessment.context.map(item => <div key={item.id}><AreaIcon kind={item.id} /><h4>{item.label}</h4><p>{item.value}</p></div>)}</div></div>
          <div className={styles.reviewControls}><details className={styles.why}>
            <summary><AreaIcon kind="book" /><span>Why these?</span><svg className={styles.whyChevron} viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M6 9L12 15L18 9" /></svg></summary>
            <div className={styles.whyBody}>
            <p>These are plausible explanations from your reported facts, not a diagnosis or a ranking of heat sources. Existing cooling and internal coverings provide context; their performance has not been measured.</p>
            {assessment.gaps.length > 0 && <><h3>Details that could refine this</h3><ul>{assessment.gaps.map(gap => <li key={gap}>{gap}</li>)}</ul></>}
            <h3>Supporting guidance</h3><p>General guidance explains the mechanisms. It does not establish the cause or size of a cooling benefit for your room.</p>
            {contributorEvidence.filter(source => assessment.contributors.some(c => c.sourceIds.includes(source.id))).map(source => <div className={styles.source} key={source.id}><a href={source.url} target="_blank" rel="noreferrer">{source.title} ↗</a><p>{source.excerpt}</p><small>Reviewed {source.reviewedAt} · {source.contentVersion}</small></div>)}
            {!assessment.contributors.length && <p>No room-specific contributor has been selected from this guidance.</p>}
            </div>
          </details>
          <Link href="/assessment" className={styles.refine}>Refine my answers →</Link></div>
        </aside>
      </div>
      {notice && <p className={styles.notice} role="status">{notice}</p>}
      <footer className={styles.footer}><Link href="/room-baseline" className={styles.back}>← <span>Back</span></Link><Link href="/cooling-options" className={styles.primary}>Explore room improvements <span aria-hidden="true">→</span></Link></footer>
    </> : <p role="status" className={styles.loading}>Loading your room answers…</p>}
  </div>;
}
