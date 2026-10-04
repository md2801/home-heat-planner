"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { hazards, reviewedOn, techniques, type HazardId } from "./catalogue";
import styles from "./resilience.module.css";

const efforts = ["Everyday preparation", "Plan ahead", "Professional help"] as const;

export function ResilienceLibrary() {
  const [hazard, setHazard] = useState<HazardId | "all">("all");
  const [query, setQuery] = useState("");
  const [effort, setEffort] = useState("all");
  const selected = hazards.find(item => item.id === hazard);
  const search = query.trim().toLowerCase();
  const matches = techniques.filter(item => (hazard === "all" || item.hazard === hazard) && (effort === "all" || item.effort === effort) && (!search || [item.title, item.summary, item.benefit, item.hazard, item.when, ...item.prepare, ...item.steps].join(" ").toLowerCase().includes(search)));
  function clearFilters() { setHazard("all"); setQuery(""); setEffort("all"); }

  return <section id="resilience-guide" aria-labelledby="resilience-guide-title">
    <div className={styles.browseHeading}><div><span className={styles.eyebrow}>THE HOME RESILIENCE GUIDE</span><h2 id="resilience-guide-title">What would you like to prepare for?</h2></div><p>{techniques.length} practical ideas · 5 areas to explore</p></div>
    <div className={styles.hazardTabs} role="group" aria-label="Filter by natural hazard">
      <button type="button" aria-pressed={hazard === "all"} onClick={() => setHazard("all")}>Explore everything <span>{techniques.length}</span></button>
      {hazards.map(item => <button type="button" key={item.id} aria-pressed={hazard === item.id} onClick={() => setHazard(item.id)}><HazardIcon hazard={item.id} />{item.title}</button>)}
    </div>
    <div className={styles.filters}>
      <label>Find a preparation<input type="search" placeholder="Try gutters, windows or emergency plans" value={query} onChange={event => setQuery(event.target.value)} /></label>
      <label>Where to start<select value={effort} onChange={event => setEffort(event.target.value)}><option value="all">All types of preparation</option>{efforts.map(item => <option key={item}>{item}</option>)}</select></label>
    </div>
    {selected && <div className={styles.hazardIntro}><HazardIcon hazard={selected.id} /><div><h3>{selected.subtitle}</h3><p>{selected.description}</p></div></div>}
    <div className={styles.resultBar}><p role="status">Showing {matches.length} of {techniques.length} ideas</p>{(hazard !== "all" || query || effort !== "all") && <button type="button" onClick={clearFilters}>Clear filters</button>}<span>Australian official guidance · Reviewed <time dateTime={reviewedOn}>4 October 2026</time></span></div>
    <div className={styles.cards}>
      {matches.map(technique => {
        const topic = hazards.find(item => item.id === technique.hazard)!;
        return <article key={technique.id} className={styles.card} id={technique.id}>
          <div className={styles.cardPhoto}><Image src={technique.image} alt="" fill sizes="(max-width: 720px) 92vw, (max-width: 1100px) 44vw, 460px" /><span className={styles.effort}>{technique.effort}</span></div>
          <div className={styles.cardBody}>
            <div className={styles.cardMeta}><span><HazardIcon hazard={technique.hazard} />{topic.title}</span><span>{technique.steps.length} steps</span></div>
            <h3>{technique.title}</h3><p>{technique.summary}</p>
            <div className={styles.timing}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" aria-hidden="true"><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg>
              <div><span>When to prepare</span><p>{technique.when}</p></div>
            </div>
            <section className={styles.steps} aria-labelledby={`${technique.id}-steps`}>
              <h4 id={`${technique.id}-steps`}>Your next steps</h4>
              <ol>{technique.steps.map((step, index) => <li key={step}><span aria-hidden="true">{String(index + 1).padStart(2, "0")}</span><p>{step}</p></li>)}</ol>
            </section>
            <section className={styles.prepare} aria-labelledby={`${technique.id}-prepare`}>
              <h4 id={`${technique.id}-prepare`}>{technique.effort === "Professional help" ? "Bring to the conversation" : "Have ready"}</h4>
              <ul>{technique.prepare.map(item => <li key={item}>{item}</li>)}</ul>
            </section>
            <div className={styles.benefit}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m6 16 11-11M7 5h10v10M5 21h14" /></svg>
              <div><h4>Why it helps</h4><p>{technique.benefit}</p></div>
            </div>
            {technique.checks[0] && <div className={styles.keyCheck}><strong>Keep in mind</strong><p>{technique.checks[0]}</p></div>}
            <details className={styles.details}>
              <summary>Checks &amp; official guidance <span aria-hidden="true">＋</span></summary>
              {technique.checks.length > 1 && <><h4>Before you start</h4><ul>{technique.checks.slice(1).map(check => <li key={check}>{check}</li>)}</ul></>}
              <div className={styles.sources}>
                <h4>Read the official guidance</h4>
                {technique.sources.map(source => <a key={source.url} href={source.url} target="_blank" rel="noopener noreferrer">{source.publisher} · {source.title} ↗<span className="sr-only"> (opens in a new tab)</span></a>)}
                {technique.relatedHref && <Link href={technique.relatedHref}>Explore the cooling technique →</Link>}
                <p className={styles.sourceReview}>Reviewed <time dateTime={reviewedOn}>4 October 2026</time> · General preparation guidance</p>
              </div>
            </details>
            {technique.sources[0] && <div className={styles.cardSource}><span>Guidance from</span><a href={technique.sources[0].url} target="_blank" rel="noopener noreferrer">{technique.sources[0].publisher} ↗<span className="sr-only"> (opens in a new tab)</span></a></div>}
          </div>
        </article>;
      })}
    </div>
    {matches.length === 0 && <div className={styles.empty}><h3>No ideas match those filters yet.</h3><p>Try a broader word or explore all preparations.</p><button type="button" onClick={clearFilters}>Show all ideas</button></div>}
    <p className={styles.sourceReview}>Images illustrate home care and improvements. Suitability depends on your property and local conditions. Earthquakes are geological hazards; this guide includes them as part of broader home resilience.</p>
  </section>;
}

function HazardIcon({ hazard }: { hazard: HazardId }) {
  return <svg className={styles.icon} viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {hazard === "heatwaves" && <><circle cx="16" cy="16" r="6" /><path d="M16 2v4m0 20v4M2 16h4m20 0h4M6 6l3 3m14 14 3 3M6 26l3-3M23 9l3-3" /></>}
    {hazard === "floods" && <><path d="m5 15 11-9 11 9M9 13v9m14-9v9M3 24q3-4 6 0t6 0t6 0t6 0M3 29q3-4 6 0t6 0t6 0t6 0M14 21v-6h4v6" /></>}
    {hazard === "storms" && <><path d="M5 16h18a5 5 0 0 0 0-10 7 7 0 0 0-13-1 5.5 5.5 0 0 0-5 11ZM11 20l-3 5m16-5-3 5M17 18l-4 7h5l-3 6" /></>}
    {hazard === "bushfires" && <><path d="M17 2c2 8-6 9-3 16 2-2 3-4 3-7 6 4 9 8 8 12-1 9-17 9-19 0-2-6 4-11 4-15 3 2 3 5 3 5 3-4 4-7 4-11Z" /><path d="M17 20c4 5 4 8 0 9-5 0-5-4-2-7" /></>}
    {hazard === "earthquakes" && <><path d="m4 14 12-10 12 10M8 13v14h6l-2-5 5-4-2-6M24 13v14h-5l-1-4 3-4M2 29h8m14 0h6" /></>}
  </svg>;
}
