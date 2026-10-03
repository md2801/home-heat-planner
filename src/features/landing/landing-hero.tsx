"use client";

import Link from "next/link";
import { useState } from "react";
import type { RoomScene } from "@/contracts/room-scene";
import { DynamicRoom } from "@/features/room-scene/dynamic-room";
import { CoolingStory } from "@/features/room-scene/cooling-story";
import styles from "./landing.module.css";

const exampleBedroom: RoomScene = {
  version: 1, above: "roof", bed: "present",
  windows: [{ direction: "north", covering: "curtains", shade: "none" }],
  equipment: ["ceiling-fan", "split-ac"],
};

export function LandingHero() {
  const [stage, setStage] = useState(0);
  return <section className={styles.hero} aria-labelledby="landing-title">
    <div className={styles.introduction}>
      <h1 id="landing-title">Your bedroom shouldn’t cost a fortune to <span>keep cool.</span></h1>
      <p className={styles.subtitle}>Find what could help in about 5 minutes.</p>
      <div className={styles.actions}>
        <Link href="/assessment" className={styles.primaryCta}>Start my assessment <span aria-hidden="true">→</span></Link>
        <p>Free. No account.</p>
      </div>
      <div className={styles.roomStory}><CoolingStory stage={stage} /></div>
    </div>
    <figure className={styles.illustration}>
      <DynamicRoom scene={exampleBedroom} placement={{ acType: "wall-mounted", acWall: "east" }} showDetails={false} presentation coolingStory showStory={false} onStoryStageChange={setStage} />
      <figcaption className={styles.exampleCaption}>An example bedroom. Yours takes shape during the assessment.</figcaption>
    </figure>
  </section>;
}
