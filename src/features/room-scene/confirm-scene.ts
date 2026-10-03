import type { RoomScene } from "../../contracts/room-scene.ts";
import type { AnswerValue } from "../../domain/models.ts";
import { answerFor, updateAnswer, type AssessmentDraft } from "../assessment/state.ts";
import { questions, WINDOW_DIRECTION_IDS } from "../assessment/questions.ts";
import { sceneBasis } from "./assessment-scene.ts";

/** One explicit confirmation updates assessment facts, so calculations cannot keep stale summaries. */
export function confirmScene(draft: AssessmentDraft, scene: RoomScene, at: string): AssessmentDraft {
  let next = draft;
  const set = (id: string, value: AnswerValue | null) => { const q = questions.find(q => q.id === id)!; next = updateAnswer(next, q, answerFor(q, value, at)); };
  set("aboveRoom", scene.above === "unknown" ? null : scene.above);
  // Preserve a reported >4 count which this prototype cannot represent.
  if (scene.windows !== null || draft.answers.windowCount?.status !== "known" || draft.answers.windowCount.value !== "more-than-four") set("windowCount", scene.windows?.length ?? null);
  if (scene.windows?.length) {
    const ws = scene.windows;
    ws.forEach((w, index) => set(WINDOW_DIRECTION_IDS[index]!, w.direction === "unknown" ? null : w.direction));
    set("windowOrientation", ws.some(w => w.direction === "unknown") ? null : [...new Set(ws.map(w => w.direction))]);
    set("internalCoverings", ws.some(w => w.covering === "unknown") ? null : ws.every(w => w.covering === "none") ? ["none"] : [...new Set(ws.map(w => w.covering).filter(c => c !== "none"))]);
    set("externalShading", ws.some(w => w.shade === "unknown") ? null : ws.every(w => w.shade === "none") ? "none" : ws.every(w => w.shade !== "none") ? "all" : "some");
  } else if (scene.windows === null) { set("windowOrientation", null); set("internalCoverings", null); set("externalShading", null); }
  const equipment = scene.equipment;
  set("cooling", equipment === null ? null : equipment.length === 0 ? ["none"] : [...new Set(equipment.map(e => e.includes("ac") ? "air-conditioner" : "fan"))]);
  if (equipment?.some(e => e.includes("fan"))) set("fanType", equipment.includes("ceiling-fan") && equipment.includes("portable-fan") ? "both" : equipment.includes("ceiling-fan") ? "ceiling" : equipment.includes("portable-fan") ? "portable" : null);
  if (equipment?.some(e => e.includes("ac"))) {
    const oldType = draft.answers.acType;
    // The bounded scene cannot distinguish other AC types. Preserve an existing report when unchanged.
    if (equipment.includes("split-ac")) set("acType", "wall-mounted");
    else if (oldType?.status !== "known" || oldType.value === "wall-mounted") set("acType", null);
  }
  return { ...next, sceneDetails: { scene, basis: sceneBasis(next.answers) } };
}
