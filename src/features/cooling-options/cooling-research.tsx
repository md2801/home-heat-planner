"use client";

import { useEffect, useRef, useState } from "react";
import type { AssessmentDraft } from "../assessment/state";
import { validResearchResult, type CoolingResearchResult, type ResearchSuggestion } from "../../contracts/cooling-research";
import { coolingResearchContext, type CoolingResearchContext } from "./research-context";
import type { OptionId } from "./model";
import styles from "./cooling-research.module.css";

type ResearchProps = { draft: AssessmentDraft; selectedId: OptionId | null; onChoose: (id: OptionId) => void };
export function CoolingResearch({ draft, selectedId, onChoose }: ResearchProps) {
  const context = coolingResearchContext(draft);
  if (!context.options.length) return null;
  // Changing room facts or eligibility cancels the old request and clears its guidance.
  return <ResearchRequest key={JSON.stringify(context)} draft={draft} context={context} selectedId={selectedId} onChoose={onChoose} />;
}

function ResearchRequest({ draft, context, selectedId, onChoose }: ResearchProps & { context: CoolingResearchContext }) {
  const [result, setResult] = useState<Extract<CoolingResearchResult, { ok: true }> | null>(null);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");
  const controller = useRef<AbortController | null>(null);
  useEffect(() => () => { controller.current?.abort(); controller.current = null; }, []);

  async function search() {
    if (controller.current) return;
    const abort = new AbortController(); controller.current = abort;
    setPending(true); setMessage("");
    const timer = setTimeout(() => abort.abort(), 45000);
    try {
      const response = await fetch("/api/cooling-research", {
        method: "POST", headers: { "Content-Type": "application/json" }, signal: abort.signal,
        body: JSON.stringify({ command: { schemaVersion: 1, operation: "recommend", assessment: { answers: draft.answers, ...(draft.sceneDetails ? { sceneDetails: draft.sceneDetails } : {}) } } }),
      });
      const data: unknown = await response.json();
      if (controller.current !== abort) return;
      if (response.ok && validResearchResult(data, context.options.map(option => option.id))) {
        setResult(data); setMessage("Your guidance is ready. Choose an investigation when you’re ready.");
      } else setMessage("The search could not finish. Your options and existing evidence are still available. You can retry shortly.");
    } catch {
      if (controller.current === abort) setMessage("The search could not finish. Your options and existing evidence are still available. You can retry shortly.");
    } finally {
      clearTimeout(timer);
      if (controller.current === abort) { controller.current = null; setPending(false); }
    }
  }

  return <section className={styles.research} aria-labelledby="cooling-research-title" aria-busy={pending}>
    <div className={styles.header}>
      <div><span className={styles.eyebrow}>FROM YOUR ANSWERS TO YOUR NEXT STEP</span><h2 id="cooling-research-title">A clearer way to cool your room</h2><p>Explore what may help, why it fits your room and where to start.</p></div>
      <button onClick={search} disabled={pending}>{pending ? "Searching guidance…" : result ? "Search again" : "Find guidance for my room"}<span aria-hidden="true">↗</span></button>
    </div>
    <p className={styles.disclosure}>Optional search of Australian government guidance. OpenAI receives room categories; your address, free-text answers, bills and quotes aren’t sent.</p>
    <p role="status" className={styles.message}>{pending ? "Searching Your Home, energy.gov.au and Energy Rating. This may take a moment." : message}</p>
    {result && <div className={styles.results}>
      <div className={styles.resultBar}><span>{result.suggestions.length} {result.suggestions.length === 1 ? "investigation" : "investigations"} for your room</span><span>Searched {new Intl.DateTimeFormat("en-AU", { dateStyle: "medium", timeStyle: "short" }).format(new Date(result.retrievedAt))}</span></div>
      <div className={styles.panels} data-count={result.suggestions.length}>{result.suggestions.map(suggestion => <ImprovementCard key={suggestion.optionId} suggestion={suggestion} title={context.options.find(option => option.id === suggestion.optionId)!.title} selected={selectedId === suggestion.optionId} onChoose={onChoose} />)}</div>
      <p className={styles.disclosure}>Things to investigate, with suitability, permissions and costs still to confirm. Savings and payback use your comparison inputs above.</p>
    </div>}
  </section>;
}

function ImprovementCard({ suggestion, title, selected, onChoose }: { suggestion: ResearchSuggestion; title: string; selected: boolean; onChoose: ResearchProps["onChoose"] }) {
  return <article className={`${styles.panel} ${selected ? styles.selected : ""}`} aria-labelledby={`research-${suggestion.optionId}`}>
    <div className={styles.panelHeading}><span className={styles.icon}><ImprovementIcon optionId={suggestion.optionId} /></span><span className={styles.optionName}>{title}</span></div>
    <h3 id={`research-${suggestion.optionId}`}>{suggestion.headline}</h3>
    <div className={styles.roomFit}><span>Your room</span><p>{suggestion.whyForRoom}</p></div>
    <div className={styles.benefit}><svg viewBox="0 0 24 24" aria-hidden="true" fill="none"><path d="M5 12L10 17L19 7" /></svg><p>{suggestion.potentialBenefit}</p></div>
    <div className={styles.action}><span className={styles.actionEyebrow}>START HERE</span><h4>{suggestion.nextAction.label}</h4><p>{suggestion.nextAction.detail}</p></div>
    <ul className={styles.checks} aria-label={`Checks for ${title}`}>{suggestion.checks.map(check => <li key={check}><span aria-hidden="true">○</span>{check}</li>)}</ul>
    <div className={styles.panelFooter}>
      <span className={styles.sourceLabel}>Read the guidance</span>
      <ul className={styles.sources} aria-label={`Sources for ${title}`}>{suggestion.sources.map(source => <li key={source.url}><a href={source.url} target="_blank" rel="noopener noreferrer">{source.title}<span aria-hidden="true">↗</span></a></li>)}</ul>
      <div className={styles.cardActions}><a href={`#${suggestion.optionId}-title`}>View comparison <span aria-hidden="true">↑</span></a><button aria-pressed={selected} aria-label={`${selected ? "Selected investigation" : "Choose investigation"} · ${title}`} onClick={() => onChoose(suggestion.optionId)}>{selected ? "Selected ✓" : "Choose investigation"}<span aria-hidden="true">→</span></button></div>
    </div>
  </article>;
}

function ImprovementIcon({ optionId }: { optionId: OptionId }) {
  return <svg viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {optionId === "external-shading" ? <><path d="M6 10H42L46 21H2ZM9 21V43M39 21V43M15 11L13 20M24 11V20M33 11L35 20M15 26V39H33V26M24 26V39" /></> : optionId === "ceiling-insulation" ? <><path d="M3 24L24 7L45 24H3ZM8 24V43H40V24M8 33H40M18 24V33M30 33V43" /><path d="M3 17L24 1L45 17" strokeDasharray="3 4" /></> : optionId === "opening-review" ? <><path d="M5 8H43V41H5ZM24 8V41M27 13L39 17V37L27 39ZM10 14H20V35H10M16 24H18" /></> : <><rect x="4" y="8" width="40" height="17" rx="4" /><path d="M10 20H38M13 31V41M24 31V45M35 31V41M10 37L13 41L16 37M21 41L24 45L27 41M32 37L35 41L38 37" /></>}
  </svg>;
}
