"use client";

import Link from "next/link";
import Image from "next/image";
import { useState } from "react";
import { categories, efforts, filterTechniques, sources, techniques, type Category, type Effort } from "./catalogue";
import styles from "./knowledge-base.module.css";

export function TechniqueLibrary() {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<Category | "all">("all");
  const [effort, setEffort] = useState<Effort | "all">("all");
  const matches = filterTechniques(query, category, effort);
  function clearFilters() { setQuery(""); setCategory("all"); setEffort("all"); }

  return <>
    <div className={styles.browseHeading}><div><span className={styles.eyebrow}>THE PRACTICAL GUIDE</span><h2>Find your next small change</h2></div><p>Browse by what you want to improve.</p></div>
    <div className={styles.categories} role="group" aria-label="Filter by focus">
      <button aria-pressed={category === "all"} onClick={() => setCategory("all")}>All techniques <span>{techniques.length}</span></button>
      {Object.entries(categories).map(([id, label]) => <button key={id} aria-pressed={category === id} onClick={() => setCategory(id as Category)}><TechniqueIcon category={id as Category} />{label}<span>{techniques.filter(item => item.category === id).length}</span></button>)}
    </div>
    <section aria-label="Find techniques" className={styles.filters}>
      <label className={styles.search}>Find a technique<input type="search" value={query} onChange={event => setQuery(event.target.value)} placeholder="Try windows, fans or lighting" /></label>
      
      <label>Getting started<select value={effort} onChange={event => setEffort(event.target.value as Effort | "all")}><option value="all">All effort levels</option>{Object.entries(efforts).map(([id, label]) => <option key={id} value={id}>{label}</option>)}</select></label>
    </section>
    <div className={styles.resultBar}><p role="status" aria-live="polite">Showing {matches.length} of {techniques.length} techniques</p>{(query || category !== "all" || effort !== "all") && <button onClick={clearFilters}>Clear filters</button>}<span>Pick one change to try first</span></div>
    <section aria-label="Energy-saving techniques" className={styles.library}>
      {matches.map(technique => <article className={styles.technique} id={technique.id} key={technique.id}>
        <div className={`${styles.cardArt} ${styles.photoHeader}`} data-category={technique.category}>
          <Image src={`/images/techniques/${technique.id}.png`} alt={`Illustrative example: ${technique.title}`} fill sizes="(max-width: 700px) 90vw, (max-width: 1050px) 43vw, 440px" />
          <TechniqueIcon category={technique.category} /><span>{efforts[technique.effort]}</span>
        </div><div className={styles.techniqueMeta}><span>{categories[technique.category]}</span><span>{technique.steps.length} practical steps</span></div>
        <h2>{technique.title}</h2><p className={styles.summary}>{technique.summary}</p>
        <div className={styles.benefit}><span aria-hidden="true">↘</span><p>{technique.benefit}</p></div>
        <details><summary><span>How to try it</span><span aria-hidden="true" className={styles.chevron}>＋</span></summary><div className={styles.details}>
          <ol>{technique.steps.map(step => <li key={step}>{step}</li>)}</ol>
          <h3>Before you start</h3><ul>{technique.checks.map(check => <li key={check}>{check}</li>)}</ul>
          <div className={styles.sources}><h3>Read the guidance</h3>{technique.sourceIds.map(id => <a key={id} href={sources[id].url} target="_blank" rel="noreferrer">{sources[id].publisher} · {sources[id].title} <span aria-hidden="true">↗</span><span className="sr-only"> (opens in a new tab)</span></a>)}</div>
        </div></details>
      </article>)}
    </section>
    {matches.length === 0 && <div className={styles.empty}><h2>No techniques match yet</h2><p>Try a broader search, or clear the filters to explore all techniques.</p><button onClick={clearFilters}>Show all techniques</button></div>}
    <footer className={styles.footer}><div><h2>Which changes fit your bedroom?</h2><p>Your room answers can help identify what is worth investigating.</p></div><Link href="/assessment">Explore my room <span aria-hidden="true">→</span></Link><Link href="/cooling-options">Back to cooling options</Link></footer>
  </>;
}

function TechniqueIcon({ category }: { category: Category }) {
  return <svg viewBox="0 0 64 64" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {category === "heat-out" ? <><circle cx="48" cy="15" r="7" /><path d="M48 3V1M60 15H63M57 6L60 3M4 25H43L38 15H10ZM10 25V57H38V25M24 29V53M14 41H34M44 30L52 38M46 41L54 49" /></> : category === "cooling" ? <><path d="M5 22H43C57 22 57 6 46 6C40 6 37 10 38 14M5 32H52C64 32 62 49 52 49C47 49 43 46 44 42M5 42H25C39 42 39 59 28 59" /><path d="M10 13H25M9 52H17" /></> : <><path d="M32 5C18 5 11 15 13 27C14 35 23 39 23 46H41C41 39 50 35 51 27C53 15 46 5 32 5ZM24 52H40M28 58H36M32 44V25M32 31C21 32 20 24 20 20C28 20 32 24 32 31ZM32 25C32 18 38 15 44 16C44 23 39 27 32 25Z" /></>}
  </svg>;
}
