import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { JourneyHeader } from "@/components/layout/journey-header";
import { EnergyChat } from "@/features/energy-assistant/energy-chat";
import { EnergyIcon } from "@/features/energy-assistant/energy-icon";
import styles from "@/features/energy-assistant/energy-assistant.module.css";
export const metadata: Metadata = { title: "Energy Assistant", description: "Understand household electricity use and investigate practical ways to reduce demand." };
export default function EnergyAssistantPage() {
  return <div className={styles.page}>
    <JourneyHeader />
    <section className={styles.hero} aria-labelledby="energy-title">
      <div><span className={styles.eyebrow}>A little understanding. A thoughtful next step.</span>
        <h1 id="energy-title">Energy Assistant<span aria-hidden="true">.</span></h1>
        <p>Make sense of your electricity use. Find small changes that fit your home.</p>
      </div>
      <Link href="/assessment" className={styles.roomLink}>← Back to your room</Link>
    </section>
    <div className={styles.workspace}>
      <EnergyChat />
      <aside className={styles.companion} aria-label="Explore energy-saving ideas">
        <div className={styles.guideCard}>
          <div className={styles.guideImage}><Image src="/images/techniques/close-curtains.png" alt="Illustration of a bedroom with curtains shading a sunny window" fill sizes="(max-width: 900px) 90vw, 340px" /></div>
          <div className={styles.guideCopy}>
            <span className={styles.eyebrow}>Start with what you have</span>
            <h2>Small changes.<br />Everyday impact.</h2>
            <p>From closing curtains to changing everyday habits, explore practical ways to use less energy.</p>
            <Link href="/knowledge-base">Explore simple techniques <EnergyIcon name="arrow" /></Link>
          </div>
        </div>
        <div className={styles.sideNote}>
          <span className={styles.noteIcon}><EnergyIcon name="leaf" /></span>
          <div><h3>Good for your home.<br />Thoughtful about energy.</h3><p>Understand what you use, check what’s possible, and take one step at a time.</p></div>
        </div>
      </aside>
    </div>
  </div>;
}
