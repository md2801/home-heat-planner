import type { AssessmentDraft } from "../assessment/state";
import { DynamicRoom as RoomScene } from "./dynamic-room";
import { assessmentScene, sceneFocus, valueOf } from "./assessment-scene";
import { equipmentPlacement, equipmentDetailText } from "./equipment-details";
import styles from "./assessment-room-preview.module.css";

export function AssessmentRoomPreview({ draft, questionId = "" }: { draft: AssessmentDraft; questionId?: string }) {
  const scene = assessmentScene(draft.answers, draft.sceneDetails);
  const focus = sceneFocus(questionId);
  const count = valueOf(draft.answers, "windowCount");
  const orientation = valueOf(draft.answers, "windowOrientation");
  const shade = valueOf(draft.answers, "externalShading");
  const insulation = valueOf(draft.answers, "insulation");
  const position = valueOf(draft.answers, "position");
  const heat = valueOf(draft.answers, "heatTiming");
  const texts = {
    room: "Room position · your layout remains schematic",
    roof: questionId === "insulation" ? "Insulation · recorded as a fact, not inferred from the drawing" : "Above your bedroom · roof or another room",
    windows: "Windows · count, direction and coverings",
    cooling: "Cooling equipment · added as you select it",
    none: "Your room takes shape as you answer",
  };
  return <section className={styles.preview} aria-label="Live room preview">
    <p className={styles.eyebrow}>YOUR ROOM SO FAR</p>
    <h2>Built from your answers</h2>
    <p className={styles.focus} aria-live="polite">{texts[focus]}</p>
    <figure><RoomScene scene={scene} focus={focus} placement={equipmentPlacement(draft.answers)} /><figcaption>Furniture, finishes, roof shape and layout are illustrative. Equipment labels reflect your answers; positions and distances are schematic. Unanswered details remain unknown.</figcaption></figure>
    <dl className={styles.facts} aria-live="polite">
      <div><dt>Position</dt><dd>{position === "ground-floor" ? "Ground floor" : position === "upper-floor" ? "Upper floor" : "Not yet known"}</dd></div>
      <div><dt>Windows</dt><dd>{typeof count === "number" ? `${count} reported` : count === "more-than-four" ? "More than four · beyond preview limit" : "Count not yet known"}</dd></div>
      <div><dt>Directions</dt><dd>{count === 0 ? "No windows" : scene.windows?.length ? scene.windows.map((w, i) => `Window ${i + 1}: ${w.direction === "unknown" ? "Not sure" : w.direction}`).join(" · ") : Array.isArray(orientation) ? orientation.join(", ") : "Not yet known"}</dd></div>
      <div><dt>External shade</dt><dd>{count === 0 ? "No windows" : shade === "all" ? "All windows · type may be unknown" : shade === "some" ? "Some windows · review which ones" : shade === "none" ? "None reported" : "Not yet known"}</dd></div>
      <div><dt>Insulation</dt><dd>{insulation === true ? "Reported present" : insulation === false ? "Reported absent" : "Not yet known"}</dd></div>
      <div><dt>Hottest times</dt><dd>{Array.isArray(heat) ? heat.join(", ") : "Not yet known"}</dd></div>
      <div><dt>Fan</dt><dd>{equipmentDetailText(draft.answers, "fan")}</dd></div>
      <div><dt>Air conditioner</dt><dd>{equipmentDetailText(draft.answers, "air-conditioner")}</dd></div>
    </dl>
  </section>;
}
