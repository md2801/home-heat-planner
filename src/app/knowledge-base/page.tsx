import type { Metadata } from "next";
import { JourneyHeader } from "@/components/layout/journey-header";
import { TechniqueLibrary } from "@/features/knowledge-base/technique-library";
import { reviewedOn, sources, techniques } from "@/features/knowledge-base/catalogue";
import styles from "@/features/knowledge-base/knowledge-base.module.css";

export const metadata: Metadata = {
  title: "Simple ways to use less energy",
  description: "Practical techniques for a cooler room and a more efficient home, with Australian government guidance.",
};

export default function KnowledgeBasePage() {
  return <div className={styles.page}>
    <JourneyHeader />
    <section className={styles.hero} aria-labelledby="knowledge-title">
      <div><span className={styles.eyebrow}>YOUR HOME · SMALL CHANGES THAT HELP</span><h1 id="knowledge-title">More comfort.<br />Less wasted energy.</h1><p>Start with what you have. Explore simple habits and practical improvements for your room and the rest of your home.</p><span className={styles.review}>{techniques.length} techniques · Australian government guidance · Reviewed <time dateTime={reviewedOn}>3 October 2026</time></span></div>
      <aside className={styles.environment}><svg className={styles.heroArt} viewBox="0 0 280 130" fill="none" aria-hidden="true"><circle cx="223" cy="39" r="26" fill="#f8cb7b"/><path d="M35 118V40L107 9L179 40V118" fill="#e1e9da" stroke="#52745f" strokeWidth="2"/><path d="M22 43L107 5L192 43" stroke="#285647" strokeWidth="3"/><path d="M64 49H146V118H64Z" fill="#fffdf7" stroke="#52745f" strokeWidth="2"/><path d="M105 49V118M64 80H146" stroke="#52745f" strokeWidth="2"/><path d="M57 48H153L143 34H67Z" fill="#93ad82" stroke="#52745f" strokeWidth="2"/><path d="M173 76H234C253 76 253 58 241 58M174 91H244M181 106H230" stroke="#73a394" strokeWidth="2" strokeLinecap="round"/><path d="M18 119H261" stroke="#b9c6ad" strokeWidth="2"/></svg><h2>Use less. Put less demand on the grid.</h2><p>Reducing electricity use can also reduce associated greenhouse gas emissions. The benefit depends on your energy supply.</p><a href={sources.environment.url} target="_blank" rel="noreferrer">Why energy efficiency helps the environment ↗<span className="sr-only"> (opens in a new tab)</span></a><small>General guidance. Your room, climate and equipment determine the result; personal savings and emissions are not calculated here.</small></aside>
    </section>
    <TechniqueLibrary />
  </div>;
}
