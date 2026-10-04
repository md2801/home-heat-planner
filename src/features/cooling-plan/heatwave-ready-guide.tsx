import Link from "next/link";
import type { AssessmentDraft } from "../assessment/state";
import { reviewedOn, sources } from "../knowledge-base/catalogue";
import { heatwaveReady } from "./heatwave-ready";
import styles from "./cooling-plan.module.css";

export function HeatwaveReadyGuide({ draft }: { draft: AssessmentDraft }) {
  const guidance = heatwaveReady(draft);
  const equipment = draft.answers.cooling;
  const hasAC = equipment?.status === "known" && Array.isArray(equipment.value) && equipment.value.includes("air-conditioner");
  return <section className={styles.heatwave} aria-labelledby="heatwave-title">
    <p className={styles.overviewEyebrow}>PREPARE · RESPOND · IMPROVE</p>
    <h2 id="heatwave-title">Heatwave-ready</h2>
    <p className={styles.sectionIntro}>Prepare for the next hot day with practical ways to limit heat gain and unnecessary cooling demand. These reviewed starting points use the room details you reported; they are not a forecast or a guarantee of comfort or safety in extreme heat.</p>
    <div className={styles.heatwaveGroups}>{guidance.groups.map(group => <section key={group.id} aria-labelledby={`heatwave-${group.id}`}>
      <h3 id={`heatwave-${group.id}`}>{group.title}</h3>
      {group.id === "cooler" && <p className={styles.sectionIntro}>Only if outdoor air is cooler and opening windows is practical, secure and safe. Check air quality and humidity each time; this does not assume evening or night conditions are suitable.</p>}
      {group.id === "cooler" && hasAC && <p>Keep windows closed while refrigerated AC runs.</p>}
      <ul>{group.actions.map(action => <li key={action.technique.id}>
        <h4>{action.title}</h4>
        {action.steps.map(step => <p key={step}>{step}</p>)}
        <details><summary>Checks & guidance</summary><ul>{action.technique.checks.map(check => <li key={check}>{check}</li>)}</ul>
          <Link href={`/knowledge-base#${action.technique.id}`}>See the full technique →</Link>
          <div className={styles.heatwaveSources}>{action.technique.sourceIds.map(id => <a key={id} href={sources[id].url} target="_blank" rel="noreferrer">{sources[id].publisher} · {sources[id].title} ↗</a>)}</div>
        </details>
      </li>)}</ul>
    </section>)}</div>
    {guidance.ventilationNote && <p className={styles.sectionIntro}>{guidance.ventilationNote} <Link href="/assessment">Review answers →</Link></p>}
    <p className={styles.localNote}>Reviewed library guidance · <time dateTime={reviewedOn}>3 October 2026</time>. No personal savings or temperature reduction is predicted. Your selected action checklist continues below; use your check-in notes to record which hot-day actions you tried.</p>
  </section>;
}
