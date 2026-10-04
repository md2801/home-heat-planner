import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { JourneyHeader } from "@/components/layout/journey-header";
import { ResilienceLibrary } from "@/features/resilience/resilience-library";
import styles from "@/features/resilience/resilience.module.css";

export const metadata: Metadata = {
  title: "Explore more · Home resilience",
  description: "Practical ways to prepare your home for heatwaves, floods, storms, bushfires and earthquakes, with Australian official guidance.",
};

export default function ExplorePage() {
  return <div className={styles.page}>
    <JourneyHeader />
    <section className={styles.hero} aria-labelledby="explore-title">
      <div className={styles.heroCopy}>
        <span className={styles.eyebrow}>EXPLORE MORE · A MORE RESILIENT HOME</span>
        <h1 id="explore-title">A home ready<br />for <em>more.</em></h1>
        <p>A little preparation can go a long way. Explore practical ways to care for your home through heat, heavy rain and other natural hazards.</p>
        <div className={styles.heroActions}><a href="#resilience-guide">Find a place to start <span aria-hidden="true">↘</span></a><Link href="/knowledge-base">Use less energy <span aria-hidden="true">→</span></Link></div>
      </div>
      <div className={styles.heroImage}>
        <Image src="/images/techniques/external-shade.png" alt="Illustrative home with external window shading" fill sizes="(max-width: 760px) 92vw, 46vw" priority />
        <div className={styles.imageCaption}><span>START BEFORE THE WEATHER CHANGES</span><strong>Small preparations.<br />A more considered home.</strong></div>
      </div>
    </section>
    <div className={styles.introStrip}>
      <div><span>01</span><p><strong>Know what matters locally</strong>Start with council and emergency-service advice.</p></div>
      <div><span>02</span><p><strong>Choose a manageable step</strong>Everyday preparation or an improvement to discuss.</p></div>
      <div><span>03</span><p><strong>Plan bigger changes carefully</strong>Bring in qualified help for building work.</p></div>
    </div>
    <ResilienceLibrary />
    <aside className={styles.official} aria-labelledby="official-guidance-title">
      <div><span className={styles.eyebrow}>WHEN CONDITIONS CHANGE</span><h2 id="official-guidance-title">Keep official advice close.</h2><p>This guide is for preparation. Follow current local warnings and emergency-service directions during an event. For a life-threatening emergency in Australia, call <a href="tel:000">000</a>.</p></div>
      <div><a href="https://www.ses.nsw.gov.au/" target="_blank" rel="noopener noreferrer">NSW SES · floods & storms ↗<span className="sr-only"> (opens in a new tab)</span></a><a href="https://www.rfs.nsw.gov.au/fire-information" target="_blank" rel="noopener noreferrer">NSW RFS · bushfire information ↗<span className="sr-only"> (opens in a new tab)</span></a><a href="https://earthquakes.ga.gov.au/" target="_blank" rel="noopener noreferrer">Geoscience Australia · earthquakes ↗<span className="sr-only"> (opens in a new tab)</span></a></div>
    </aside>
    <footer className={styles.footer}><div><span className={styles.eyebrow}>START WITH YOUR EVERYDAY COMFORT</span><h2>Make your next hot day a little easier.</h2><p>Explore your room, understand your cooling use, and choose a practical next step.</p></div><Link href="/assessment">Explore my room <span aria-hidden="true">→</span></Link></footer>
  </div>;
}
