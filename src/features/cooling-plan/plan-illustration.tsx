import { JourneyRoom } from "@/features/room-scene/journey-room";
import type { AssessmentDraft } from "../assessment/state";
import type { CoolingOption } from "@/features/cooling-options/model";
import styles from "./cooling-plan.module.css";

export function PlanIllustration({ option, draft }: { option: CoolingOption | null; draft: AssessmentDraft }) {
  const focus = !option ? "none" : option?.id === "ceiling-insulation" ? "roof" : option?.id === "ac-replacement" ? "cooling" : "windows";
  return <figure className={styles.illustration}><div className={styles.scene}><JourneyRoom draft={draft} focus={focus} /></div><figcaption>Your reported room · selected changes are not shown as completed.<br />Layout is illustrative.</figcaption></figure>;
}
