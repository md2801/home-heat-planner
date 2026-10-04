"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import type { AssessmentDraft } from "../assessment/state";
import { validResearchResult, type CoolingResearchResult, type ResearchSuggestion, type ResearchTechnique } from "../../contracts/cooling-research";
import { coolingResearchContext, type CoolingResearchContext } from "./research-context";
import { coolingOptions, type CoolingOption, type OptionId } from "./model";
import { contributorEvidence } from "../heat-contributors/evidence";
import { recommendationResources } from "../knowledge-base/recommendation-resources";
import { reviewedOn, techniques, sources as librarySources, efforts, type Technique } from "../knowledge-base/catalogue";
import { hasReportedAC } from "./recommendation-policy";
import { availableSimpleActions } from "./simple-actions";
import { formatMoney } from "../room-baseline/model";
import styles from "./cooling-research.module.css";

type ResearchProps = { draft: AssessmentDraft; selectedId: OptionId | null; onChoose: (id: OptionId) => void; selectedTechniques: string[]; onToggleTechnique: (id: string) => void };
export function CoolingResearch({ draft, selectedId, onChoose, selectedTechniques, onToggleTechnique }: ResearchProps) {
  const context = coolingResearchContext(draft);
  if (!context.options.length && !recommendationResources(context).techniqueIds.length) return null;
  // Changing room facts or eligibility cancels the old request and clears its guidance.
  return <ResearchRequest key={JSON.stringify(context)} draft={draft} context={context} selectedId={selectedId} onChoose={onChoose} selectedTechniques={selectedTechniques} onToggleTechnique={onToggleTechnique} />;
}

function ResearchRequest({ draft, context, selectedId, onChoose, selectedTechniques, onToggleTechnique }: ResearchProps & { context: CoolingResearchContext }) {
  const options = coolingOptions(draft).options;
  const resources = recommendationResources(context);
  const constraints = { coolingEquipment: context.room.coolingEquipment, techniqueIds: resources.techniqueIds };
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
      if (response.ok && validResearchResult(data, context.options.map(option => option.id), resources.byOption, constraints)) {
        setResult(data); setMessage("Your guidance is ready, based on your room answers and retrieved sources.");
      } else setMessage("The search could not finish. Your options and existing evidence are still available. You can retry shortly.");
    } catch {
      if (controller.current === abort) setMessage("The search could not finish. Your options and existing evidence are still available. You can retry shortly.");
    } finally {
      clearTimeout(timer);
      if (controller.current === abort) { controller.current = null; setPending(false); }
    }
  }

  const shownOptions = result ? result.suggestions.flatMap(suggestion => { const option = options.find(item => item.id === suggestion.optionId); return option ? [{ option, suggestion }] : []; }) : options.map(option => ({ option, suggestion: undefined }));
  const available = availableSimpleActions(draft);
  const shownTechniques = available.map(technique => ({ technique, suggestion: result?.techniques.find(item => item.techniqueId === technique.id) })).sort((a, b) => Number(b.technique.id === "reduce-indoor-heat") - Number(a.technique.id === "reduce-indoor-heat"));
  const passive = shownOptions.filter(({ option }) => option.id !== "ac-replacement");
  const equipment = options.filter(option => option.id === "ac-replacement");
  const count = shownOptions.length + shownTechniques.length;

  return <section className={styles.research} aria-labelledby="cooling-research-title" aria-busy={pending}>
    <div className={styles.header}>
      <div><span className={styles.eyebrow}>FROM YOUR ANSWERS TO YOUR NEXT STEP</span><h2 id="cooling-research-title">Build your room plan</h2><p>Choose something to try today. Add a room investigation if you want to go further.</p></div>
      <button onClick={search} disabled={pending}>{pending ? "Finding your next steps…" : result ? "Refresh my recommendations" : "Personalise my recommendations"}<span aria-hidden="true">↗</span></button>
    </div>
    <p className={styles.disclosure}>Optional search of Australian government guidance. OpenAI receives room categories; your address, free-text answers, bills and quotes aren’t sent.</p>
    <p role="status" className={styles.message}>{pending ? `Finding practical guidance from Your Home and energy.gov.au${hasReportedAC(context.room.coolingEquipment) ? " and checking Energy Rating" : ""}. This may take a moment.` : message}</p>
    {pending ? <GuidanceSkeleton count={Math.max(1, Math.min(count, 4))} /> : <div className={styles.results}>
      <div className={styles.resultBar}><span>{count} {count === 1 ? "next step" : "next steps"} for your room</span><span>{result ? `Searched ${new Intl.DateTimeFormat("en-AU", { dateStyle: "medium", timeStyle: "short" }).format(new Date(result.retrievedAt))}` : "Reviewed starting points · personalise for your room"}</span></div>
      {passive.length > 0 && <><h3 className={styles.groupTitle}>Reduce heat in the room</h3><p className={styles.disclosure}>Your answers point to these areas to check. This is a starting point, not a diagnosis or a ranking of savings.</p><div className={styles.panels} data-count={passive.length}>{passive.map(({ option, suggestion }) => <ImprovementCard key={option.id} option={option} suggestion={suggestion} hasAC={hasReportedAC(context.room.coolingEquipment)} selected={selectedId === option.id} onChoose={onChoose} />)}</div></>}
      {shownTechniques.length > 0 && <><h3 className={styles.groupTitle}>Try today · Use less energy with what you have</h3><p className={styles.disclosure}>Add one or more actions. You can make a plan with these alone.</p><div className={styles.panels} data-count={shownTechniques.length}>{shownTechniques.map(({ technique, suggestion }) => <TechniqueCard key={technique.id} technique={technique} suggestion={suggestion} selected={selectedTechniques.includes(technique.id)} onToggle={() => onToggleTechnique(technique.id)} />)}</div></>}
      {equipment.length > 0 && <details className={styles.details}><summary>Optional · Consider changing equipment {selectedId === "ac-replacement" ? "· Added to plan" : ""}<span aria-hidden="true">⌄</span></summary><p>Explore this if you are already considering replacement. You can start with room improvements and existing equipment.</p><div className={styles.panels} data-count={equipment.length}>{equipment.map(option => <ImprovementCard key={option.id} option={option} suggestion={result?.suggestions.find(item => item.optionId === option.id)} hasAC selected={selectedId === option.id} onChoose={onChoose} />)}</div></details>}
      {result && options.some(option => option.id !== "ac-replacement" && !passive.some(item => item.option.id === option.id)) && <details className={styles.details}><summary>Other room investigations <span aria-hidden="true">⌄</span></summary><div className={styles.panels}>{options.filter(option => option.id !== "ac-replacement" && !passive.some(item => item.option.id === option.id)).map(option => <ImprovementCard key={option.id} option={option} suggestion={undefined} hasAC={hasReportedAC(context.room.coolingEquipment)} selected={selectedId === option.id} onChoose={onChoose} />)}</div></details>}
    </div>}
  </section>;
}

function GuidanceSkeleton({ count }: { count: number }) {
  return <div className={styles.results} aria-hidden="true">
    <div className={styles.resultBar}><span className={`${styles.skeletonBlock} ${styles.skeletonMeta}`} /><span className={`${styles.skeletonBlock} ${styles.skeletonMeta}`} /></div>
    <div className={styles.panels} data-count={count}>{Array.from({ length: count }, (_, index) => <div className={`${styles.panel} ${styles.skeletonCard}`} key={index}>
      <div className={styles.panelHeading}><span className={`${styles.skeletonBlock} ${styles.skeletonIcon}`} /><span className={`${styles.skeletonBlock} ${styles.skeletonOption}`} /></div>
      <div className={styles.skeletonTitle}><span className={styles.skeletonBlock} /><span className={`${styles.skeletonBlock} ${styles.skeletonShort}`} /></div>
      <div className={styles.roomFit}><span className={`${styles.skeletonBlock} ${styles.skeletonLabel}`} /><span className={`${styles.skeletonBlock} ${styles.skeletonLine}`} /><span className={`${styles.skeletonBlock} ${styles.skeletonLine} ${styles.skeletonShort}`} /></div>
      <div className={styles.benefit}><span className={`${styles.skeletonBlock} ${styles.skeletonDot}`} /><span className={`${styles.skeletonBlock} ${styles.skeletonLine}`} /></div>
      <div className={styles.action}><span className={`${styles.skeletonBlock} ${styles.skeletonLabel}`} /><span className={`${styles.skeletonBlock} ${styles.skeletonAction}`} /><span className={`${styles.skeletonBlock} ${styles.skeletonLine}`} /></div>
      <div className={styles.checks}><span className={`${styles.skeletonBlock} ${styles.skeletonLine}`} /><span className={`${styles.skeletonBlock} ${styles.skeletonLine} ${styles.skeletonShort}`} /></div>
      <div className={styles.panelFooter}><span className={`${styles.skeletonBlock} ${styles.skeletonLabel}`} /><div className={styles.sources}><span className={`${styles.skeletonBlock} ${styles.skeletonSource}`} /><span className={`${styles.skeletonBlock} ${styles.skeletonSource}`} /></div><div className={styles.cardActions}><span className={`${styles.skeletonBlock} ${styles.skeletonSource}`} /><span className={`${styles.skeletonBlock} ${styles.skeletonButton}`} /></div></div>
    </div>)}</div>
  </div>;
}

const benefits: Record<OptionId, { category: string; text: string }> = {
  "external-shading": { category: "KEEP HEAT OUT", text: "External shade could reduce solar heat entering through glass and the cooling energy needed. Check the sun path and shade design for your window." },
  "ceiling-insulation": { category: "KEEP HEAT OUT", text: "Suitable ceiling insulation could limit heat transfer from a hot roof space. Confirm existing insulation and arrange a qualified inspection." },
  "opening-review": { category: "RELEASE HEAT WHEN CONDITIONS ALLOW", text: "Ventilation could help release stored heat when outdoor air is cooler. Check air quality, security and noise." },
  "ac-replacement": { category: "COOL EFFICIENTLY WHEN NEEDED", text: "A comparable efficient AC could use less electricity for cooling. Room improvements may also reduce the load on the equipment you already have." },
};

const investigationCopy: Record<OptionId, { headline: string; action: string }> = {
  "external-shading": { headline: "Explore shade for your windows", action: "Check when direct sun comes in" },
  "ceiling-insulation": { headline: "Check heat from above", action: "Check your insulation records" },
  "opening-review": { headline: "Explore safe airflow", action: "Review how your windows can open" },
  "ac-replacement": { headline: "Compare like-for-like cooling", action: "Check both AC energy labels" },
};

function ImprovementCard({ option, suggestion, hasAC, selected, onChoose }: { option: CoolingOption; suggestion: ResearchSuggestion | undefined; hasAC: boolean; selected: boolean; onChoose: ResearchProps["onChoose"] }) {
  const copy = investigationCopy[option.id];
  const roomFacts = option.contributor.reasons.filter(reason => reason.fact.status === "known" && reason.fieldId !== "ventilationConstraints").map(reason => `${reason.label}: ${reason.value}`).join(" · ");
  const sources = suggestion?.sources ?? contributorEvidence.filter(source => option.recommendation.sourceIds.includes(source.id));
  return <article className={`${styles.panel} ${selected ? styles.selected : ""}`} aria-labelledby={`research-${option.id}`}>
    <div className={styles.panelHeading}><span className={styles.icon}><ImprovementIcon optionId={option.id} /></span><span className={styles.optionName}>{option.title}</span></div>
    <p className={styles.pathway}>{benefits[option.id].category}</p><h3 id={`research-${option.id}`}>{suggestion?.headline ?? copy.headline}</h3>
    <div className={styles.roomFit}><span>Your room · reported by you</span><p>{suggestion?.whyForRoom ?? (roomFacts || (option.id === "ac-replacement" ? "You reported air conditioning in this bedroom." : option.description))}</p></div>
    {<div className={styles.benefit}><svg viewBox="0 0 24 24" aria-hidden="true" fill="none"><path d="M5 12L10 17L19 7" /></svg><p>{suggestion?.potentialBenefit ?? `${benefits[option.id].text}${option.id === "opening-review" && hasAC ? " Close windows while running AC." : ""}`}</p></div>}
    {option.id === "external-shading" && hasAC && <div className={styles.savingsPreview}>
      <span className={styles.sourceLabel}>{option.shadingScenario ? "YOUR SHADING SCENARIO · WHAT-IF" : "EXPLORE THE COST DIFFERENCE"}</span>
      {option.shadingScenario ? <><strong>{formatMoney(Math.abs(option.shadingScenario.savingsAud))} {option.shadingScenario.savingsAud < 0 ? "more" : "less"} over {option.shadingScenario.coolingDays} cooling days</strong><p>{option.shadingScenario.baseline.periodCostAud.toFixed(2)} → {option.shadingScenario.improved.periodCostAud.toFixed(2)} AUD · {option.shadingScenario.periodLabel}</p><small>Synthetic weather and your reviewed assumptions. Actual savings are not established.</small></> : <p>Compare cooling costs before and after shading one window or a group facing the same way.</p>}
      <a href="#shading-savings">{option.shadingScenario ? "Review my assumptions" : "Try a shading cost scenario"} <span aria-hidden="true">→</span></a>
    </div>}
    <div className={styles.action}><span className={styles.actionEyebrow}>START HERE</span><h4>{suggestion?.nextAction.label ?? copy.action}</h4><p>{suggestion?.nextAction.detail ?? option.recommendation.description}</p></div>
    {suggestion && <ul className={styles.checks} aria-label={`Checks for ${option.title}`}>{suggestion.checks.map(check => <li key={check}><span aria-hidden="true">○</span>{check}</li>)}</ul>}
    <details className={styles.details}><summary>Details & checks <span aria-hidden="true">⌄</span></summary><p>{option.contributor.explanation}</p><ul>{option.recommendation.requiredChecks.map(check => <li key={check}>{check}</li>)}</ul>{option.recommendation.comfortTradeOffs.map(tradeoff => <p key={tradeoff}>{tradeoff}</p>)}</details>
    <div className={styles.panelFooter}>
      {suggestion && suggestion.techniqueIds.length > 0 && <LibraryGuides ids={suggestion.techniqueIds} />}
      <span className={styles.sourceLabel}>Read the guidance</span>
      <ul className={styles.sources} aria-label={`Sources for ${option.title}`}>{sources.map(source => <li key={source.url}><a href={source.url} target="_blank" rel="noopener noreferrer">{source.title}<span aria-hidden="true">↗</span></a></li>)}</ul>
      <div className={styles.cardActions}><span className={styles.readiness}>{option.id === "ac-replacement" ? "Check labels, sizing & quote" : option.readiness}</span><button aria-pressed={selected} aria-label={`${selected ? "Remove investigation" : "Add investigation to plan"} · ${option.title}`} onClick={() => onChoose(option.id)}>{selected ? "Remove from plan" : "Add investigation to plan"}<span aria-hidden="true">→</span></button></div>
    </div>
  </article>;
}

function TechniqueCard({ technique, suggestion, selected, onToggle }: { technique: Technique; suggestion: ResearchTechnique | undefined; selected: boolean; onToggle: () => void }) {
  const sources = suggestion?.sources ?? technique.sourceIds.map(id => librarySources[id]);
  return <article className={`${styles.panel} ${styles.simplePanel} ${selected ? styles.selected : ""}`} aria-labelledby={`technique-${technique.id}`}>
    <div className={styles.panelHeading}><span className={styles.icon} aria-hidden="true">✧</span><span className={styles.optionName}>{efforts[technique.effort]}</span></div>
    <h3 id={`technique-${technique.id}`}>{suggestion?.headline ?? technique.title}</h3>
    <div className={styles.roomFit}><span>{suggestion ? "Your room · reported by you" : "Reviewed starting point"}</span><p>{suggestion?.whyForRoom ?? technique.summary}</p></div>
    <div className={styles.benefit}><p>{suggestion?.potentialBenefit ?? technique.benefit}</p></div>
    <div className={styles.action}><span className={styles.actionEyebrow}>TRY THIS</span><h4>{suggestion?.nextAction.label ?? technique.steps[0]}</h4><p>{suggestion?.nextAction.detail ?? technique.steps[1]}</p></div>
    {suggestion && <ul className={styles.checks}>{suggestion.checks.map(check => <li key={check}><span aria-hidden="true">○</span>{check}</li>)}</ul>}
    <details className={styles.details}><summary>Suitability & checks <span aria-hidden="true">⌄</span></summary><ul>{technique.checks.map(check => <li key={check}>{check}</li>)}</ul></details>
    <div className={styles.panelFooter}><span className={styles.sourceLabel}>Read the guidance</span><ul className={styles.sources}>{sources.map(source => <li key={source.url}><a href={source.url} target="_blank" rel="noopener noreferrer">{source.title} ↗</a></li>)}</ul><div className={styles.cardActions}><Link href={`/knowledge-base#${technique.id}`}>See how to try it →</Link><button aria-pressed={selected} aria-label={`${selected ? "Remove" : "Add to plan"} · ${technique.title}`} onClick={onToggle}>{selected ? "Added ✓ · Remove" : "Add to my plan +"}</button></div></div>
  </article>;
}

function LibraryGuides({ ids }: { ids: readonly string[] }) {
  const resources = ids.flatMap(id => { const technique = techniques.find(item => item.id === id); return technique ? [technique] : []; });
  if (!resources.length) return null;
  return <div className={styles.libraryGuides}><span className={styles.sourceLabel}>Simple techniques to try</span><ul>{resources.map(resource => <li key={resource.id}><Link href={`/knowledge-base#${resource.id}`}>{resource.title}<span aria-hidden="true">→</span></Link></li>)}</ul><small>From our reviewed library · <time dateTime={reviewedOn}>3 October 2026</time></small></div>;
}

function ImprovementIcon({ optionId }: { optionId: OptionId }) {
  return <svg viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {optionId === "external-shading" ? <><path d="M6 10H42L46 21H2ZM9 21V43M39 21V43M15 11L13 20M24 11V20M33 11L35 20M15 26V39H33V26M24 26V39" /></> : optionId === "ceiling-insulation" ? <><path d="M3 24L24 7L45 24H3ZM8 24V43H40V24M8 33H40M18 24V33M30 33V43" /><path d="M3 17L24 1L45 17" strokeDasharray="3 4" /></> : optionId === "opening-review" ? <><path d="M5 8H43V41H5ZM24 8V41M27 13L39 17V37L27 39ZM10 14H20V35H10M16 24H18" /></> : <><rect x="4" y="8" width="40" height="17" rx="4" /><path d="M10 20H38M13 31V41M24 31V45M35 31V41M10 37L13 41L16 37M21 41L24 45L27 41M32 37L35 41L38 37" /></>}
  </svg>;
}
