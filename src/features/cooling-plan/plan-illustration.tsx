import { JourneyRoom } from "@/features/room-scene/journey-room";
import type { AssessmentDraft } from "../assessment/state";
import type { CoolingOption } from "@/features/cooling-options/model";
import styles from "./cooling-plan.module.css";

export function PlanIllustration({ option, draft }: { option: CoolingOption; draft: AssessmentDraft }) {
  const focus = option.id === "ceiling-insulation" ? "roof" : option.id === "ac-replacement" ? "cooling" : "windows";
  return <figure className={styles.illustration}><div className={styles.scene}><JourneyRoom draft={draft} focus={focus} /></div><figcaption>Your reported room · highlight shows the area to investigate.<br />Your selected action is not shown as installed. Layout is illustrative.</figcaption></figure>;
}
