import { JourneyHeader } from "@/components/layout/journey-header";
import { LandingHero } from "./landing-hero";
import styles from "./landing.module.css";

function BenefitIcon({ kind }: { kind: "sun" | "compare" | "leaves" }) {
  return <svg viewBox="0 0 48 48" fill="none" aria-hidden="true">
    {kind === "sun" && <g stroke="var(--color-heat-light)" strokeWidth="1.6" strokeLinecap="round">
      <circle cx="24" cy="24" r="11" fill="var(--color-heat-light)" />
      <path d="M24 2V8M24 40V46M2 24H8M40 24H46M8.5 8.5L13 13M35 35L39.5 39.5M8.5 39.5L13 35M35 13L39.5 8.5" />
    </g>}
    {kind === "compare" && <g fill="var(--color-forest)">
      <path d="M7 27H12V43H7ZM18 19H23V43H18ZM29 8H34V43H29Z" />
      <path d="M4 43H43V45H4Z" />
    </g>}
    {kind === "leaves" && <g stroke="var(--color-forest)" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
      <path d="M26 42C23 27 15 14 5 7M24 36C10 36 4 24 4 7C20 7 28 17 24 30M27 42C30 31 34 26 41 21M28 37C28 24 34 21 42 20C43 34 38 40 28 41M11 15L11 24L20 23M34 28L35 34" />
    </g>}
  </svg>;
}

const benefits = [
  { icon: "sun", title: "Keep heat out", description: "Explore shade and insulation for your room." },
  { icon: "compare", title: "Let heat escape", description: "Review ventilation for cooler, safe outdoor conditions." },
  { icon: "leaves", title: "Cool efficiently", description: "Compare energy and costs when cooling is needed." },
] as const;

export function LandingPage() {
  return <div className={styles.page}>
    <JourneyHeader />

    <LandingHero />

    <div className={styles.lowerRow}>
      <section id="how-it-works" aria-label="How it works" className={styles.benefits}>
        {benefits.map((benefit) => <div key={benefit.icon} className={styles.benefit}>
          <BenefitIcon kind={benefit.icon} />
          <h2>{benefit.title}</h2>
          <p>{benefit.description}</p>
        </div>)}
      </section>
      <div className={styles.timeline} aria-label="Illustrative sun timeline: morning, midday, afternoon">
        <span className={styles.timelineTitle}>Sun</span>
        <div className={styles.timelineTrack} aria-hidden="true">
          <div className={styles.timelineLine} />
          <span className={styles.morning}><i />Morning</span>
          <span className={styles.midday}><i />Midday</span>
          <span className={styles.afternoon}><i />Afternoon</span>
          <i className={styles.endDot} />
        </div>
      </div>
    </div>

    <details id="help" className={styles.help}>
      <summary>About your assessment</summary>
      <p>Start with one bedroom in Greater Sydney. You can leave details you don’t know as unknown. Any later estimates need suitable inputs and evidence; savings and cooling improvements are not guaranteed.</p>
    </details>
  </div>;
}
