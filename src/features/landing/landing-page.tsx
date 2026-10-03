import Link from "next/link";
import { DynamicRoom } from "@/features/room-scene/dynamic-room";
import type { RoomScene } from "@/contracts/room-scene";
import styles from "./landing.module.css";

function LeafMark() {
  return <svg viewBox="0 0 32 32" fill="none" aria-hidden="true">
    <rect x="2" y="2" width="28" height="28" rx="4" fill="var(--color-heat-light)" stroke="var(--color-forest)" strokeWidth="2" />
    <path d="M8 25C9 9 19 15 25 7C26 20 19 25 12 23M7 26L21 13M12 21L13 15M16 18L22 18" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
  </svg>;
}

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
  { icon: "sun", title: "Understand the heat", description: "See what’s making your room hot." },
  { icon: "compare", title: "Compare your options", description: "See what could work for your room and budget." },
  { icon: "leaves", title: "See what could save", description: "Get clear costs, potential savings and next steps." },
] as const;

const exampleBedroom: RoomScene = {
  version: 1, above: "roof", bed: "present",
  windows: [{ direction: "north", covering: "curtains", shade: "none" }],
  equipment: ["ceiling-fan", "split-ac"],
};

export function LandingPage() {
  return <div className={styles.page}>
    <header className={styles.header}>
      <Link href="/" className={styles.brand}><LeafMark /><span>Home Heat Planner</span></Link>
      <nav aria-label="Main navigation" className={styles.navigation}>
        <Link href="/cooling-plan">My Plan</Link>
        <a href="#how-it-works">How it works</a>
        <a href="#help">Help</a>
      </nav>
    </header>

    <section className={styles.hero} aria-labelledby="landing-title">
      <div className={styles.introduction}>
        <h1 id="landing-title">Your bedroom<br className={styles.desktopBreak} /> shouldn’t cost a<br className={styles.desktopBreak} /> fortune to <span>keep cool.</span></h1>
        <p className={styles.subtitle}>Find what could help in about 5 minutes.</p>
        <div className={styles.actions}>
          <Link href="/assessment" className={styles.primaryCta}>Start my assessment <span aria-hidden="true">→</span></Link>
          <p>Free. No account.</p>
        </div>
      </div>
      <figure className={styles.illustration}>
        <DynamicRoom scene={exampleBedroom} placement={{ acType: "wall-mounted", acWall: "east" }} showDetails={false} presentation coolingStory />
        <figcaption className="sr-only">Example room · your own bedroom takes shape during the assessment.</figcaption>
      </figure>
    </section>

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
