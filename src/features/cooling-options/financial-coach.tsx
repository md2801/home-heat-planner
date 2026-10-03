"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import type { AssessmentDraft } from "../assessment/state";
import { assessmentInput } from "../../contracts/journey";
import { financialBrief, validBriefSelection, type BriefFocus } from "./financial-brief";
import styles from "./financial-coach.module.css";
export function FinancialCoach({ draft }: { draft: AssessmentDraft }) {
  const [focus, setFocus] = useState<BriefFocus>("understand");
  const cards = financialBrief(draft);
  // Remount the request boundary on meaningful context changes, cancelling stale calls.
  const signature = JSON.stringify({ cards, focus });
  return <section className={styles.coach} aria-labelledby="financial-coach-title">
    <div className={styles.intro}>
      <span className={styles.eyebrow}>YOUR SPENDING GUIDE</span>
      <h2 id="financial-coach-title">Clarity before <br />you commit.</h2>
      <p>A little context makes a better decision. Start with what matters to you.</p>
      <fieldset className={styles.focusChoices}><legend>Focus your brief</legend>{([
        ["understand", "Understand the costs", "See what the figures mean", "01"],
        ["budget", "Make my budget count", "Understand affordability", "02"],
        ["next-step", "Find my next step", "Know what to confirm first", "03"],
      ] as const).map(([value, title, detail, number]) => <label key={value} className={focus === value ? styles.active : ""}><input type="radio" name="brief-focus" checked={focus === value} onChange={() => setFocus(value)} /><span className={styles.number}>{number}</span><span><strong>{title}</strong><small>{detail}</small></span><span aria-hidden="true" className={styles.choiceMark}>{focus === value ? "✓" : ""}</span></label>)}</fieldset>
      <p className={styles.footnote}>Grounded in your inputs.<br />Unknown costs stay unknown.</p>
    </div>
    <div className={styles.content}><BriefResult key={signature} draft={draft} focus={focus} cards={cards} /></div>
  </section>;
}
function BriefResult({ draft, focus, cards }: { draft: AssessmentDraft; focus: BriefFocus; cards: ReturnType<typeof financialBrief> }) {
  const [ids, setIds] = useState<string[] | null>(null);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");
  const controller = useRef<AbortController | null>(null);
  useEffect(() => () => controller.current?.abort(), []);
  async function personalise() {
    const abort = new AbortController(); controller.current = abort; setPending(true); setMessage("");
    const timer = setTimeout(() => abort.abort(), 22000);
    try {
      const response = await fetch("/api/financial-brief", { method: "POST", headers: { "Content-Type": "application/json" }, signal: abort.signal, body: JSON.stringify({ command: { schemaVersion: 1, operation: "compare", assessment: assessmentInput(draft) }, focus }) });
      const data: unknown = await response.json();
      if (response.ok && data && typeof data === "object" && "ok" in data && data.ok === true && "ids" in data && validBriefSelection({ ids: data.ids }, cards)) {
        setIds(data.ids as string[]); setMessage("Your brief is ready, ordered around your chosen focus.");
      } else setMessage("Assistance is unavailable. Your calculated summary is still available below; you can retry.");
    } catch { if (controller.current === abort) setMessage("Assistance could not finish. The summary below remains available; you can retry."); }
    finally { clearTimeout(timer); if (controller.current === abort) setPending(false); }
  }
  const shown = ids ? ids.map(id => cards.find(c => c.id === id)!) : cards.slice(0, 3);
  return <>
    <div className={styles.briefHeader}><div><span className={styles.eyebrow}>THE FINANCIAL PICTURE</span><h3>Your decision brief</h3></div><span className={styles.summaryLabel}>{ids ? "Personalised" : "At a glance"}</span></div>
    <p className={styles.lead}>What we know, what it means, and where to go next.</p>
    <div className={styles.entries} aria-busy={pending}>{shown.map((card, index) => <details key={card.id} className={styles.entry} open={index === 0 ? true : undefined}>
      <summary><span className={styles.entryNumber}>{String(index + 1).padStart(2, "0")}</span><span>{card.title}</span><span className={styles.chevron} aria-hidden="true">⌄</span></summary>
      <div className={styles.entryBody}><p>{card.text}</p>{card.checks.length > 0 && <div className={styles.checks}><h4>Before you decide</h4><ul>{card.checks.map(check => <li key={check}><span aria-hidden="true">○</span>{check}</li>)}</ul></div>}<Link className={styles.nextLink} href={card.href}>{card.link}<span aria-hidden="true">↗</span></Link></div>
    </details>)}</div>
    <div className={styles.assist}><div><strong>A brief around your priorities</strong><p>Let OpenAI prioritise these explanations for your chosen focus.</p></div><button disabled={pending} onClick={personalise}>{pending ? "Preparing…" : ids ? "Refresh brief" : "Personalise my brief"}<span aria-hidden="true">→</span></button></div>
    <p role="status" className={styles.message}>{message}</p>
    <details className={styles.privacy}><summary>How your brief is prepared</summary><p>Optional: OpenAI receives a summary of calculated costs, limitations and checks to prioritise your reading. Figures and wording come from the app’s checked comparison. It does not set prices, estimate savings or rank installations.</p></details>
  </>;
}
