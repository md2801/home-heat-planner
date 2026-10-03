import { directions, emptyScene, isRoomScene, type RoomScene, type SceneWindow } from "../../contracts/room-scene.ts";
import type { AssessmentAnswers } from "../../domain/models.ts";
import { WINDOW_DIRECTION_IDS, EQUIPMENT_QUESTION_IDS } from "../assessment/questions.ts";

const keys = ["aboveRoom", "windowCount", "windowOrientation", "externalShading", "internalCoverings", "cooling"] as const;
export interface AssessmentSceneDetails { scene: RoomScene; basis: Record<string, string> }
export const valueOf = (answers: AssessmentAnswers, key: string) => answers[key]?.status === "known" ? answers[key].value : undefined;
export function sceneBasis(answers: AssessmentAnswers): Record<string, string> {
  return Object.fromEntries(keys.map(key => { const value = valueOf(answers, key); return [key, JSON.stringify(Array.isArray(value) ? value.toSorted() : value ?? null)]; }));
}
export function isAssessmentSceneDetails(value: unknown): value is AssessmentSceneDetails {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const r = value as Record<string, unknown>;
  if (Object.keys(r).length !== 2 || !isRoomScene(r.scene) || !r.basis || typeof r.basis !== "object" || Array.isArray(r.basis)) return false;
  const basis = r.basis as Record<string, unknown>;
  return Object.keys(basis).length === keys.length && keys.every(key => typeof basis[key] === "string" && basis[key].length < 1000);
}
/** Pure projection: answers render immediately; confirmed individual details survive unrelated edits. */
export function assessmentScene(answers: AssessmentAnswers, details?: AssessmentSceneDetails): RoomScene {
  const scene = emptyScene();
  const above = valueOf(answers, "aboveRoom");
  if (above === "roof" || above === "another-room" || above === "another-dwelling") scene.above = above;
  const count = valueOf(answers, "windowCount");
  const orientation = valueOf(answers, "windowOrientation");
  const covering = valueOf(answers, "internalCoverings");
  const shade = valueOf(answers, "externalShading");
  if (typeof count === "number" && Number.isInteger(count) && count >= 0 && count <= 4) {
    const direction = Array.isArray(orientation) && orientation.length === 1 && directions.includes(orientation[0] as SceneWindow["direction"]) ? orientation[0] as SceneWindow["direction"] : "unknown";
    const inside = Array.isArray(covering) && covering.length === 1 && ["none", "curtains", "blinds", "shutters"].includes(covering[0]!) ? covering[0] as SceneWindow["covering"] : "unknown";
    const hasIndividual = WINDOW_DIRECTION_IDS.some(id => answers[id]);
    scene.windows = Array.from({ length: count }, (_, i) => {
      const individual = valueOf(answers, WINDOW_DIRECTION_IDS[i]!);
      return { direction: hasIndividual ? typeof individual === "string" && directions.includes(individual as SceneWindow["direction"]) ? individual as SceneWindow["direction"] : "unknown" : direction, covering: inside, shade: shade === "none" ? "none" : shade === "all" ? "present-unspecified" : "unknown" };
    });
  }
  const cooling = valueOf(answers, "cooling");
  if (Array.isArray(cooling)) {
    const fan = valueOf(answers, "fanType");
    const ac = valueOf(answers, "acType");
    scene.equipment = [ ...(cooling.includes("air-conditioner") ? [ac === "wall-mounted" ? "split-ac" as const : "ac-unspecified" as const] : []), ...(cooling.includes("fan") ? fan === "ceiling" ? ["ceiling-fan" as const] : fan === "portable" ? ["portable-fan" as const] : fan === "both" ? ["ceiling-fan" as const, "portable-fan" as const] : ["fan-unspecified" as const] : []) ];
  }
  if (details) {
    const current = sceneBasis(answers);
    const matches = (ids: string[]) => ids.every(id => details.basis[id] === current[id]);
    scene.bed = details.scene.bed;
    // Manual type answers, including explicit unknowns, override stale confirmed scene types.
    if (matches(["cooling"])) {
      if (!answers.fanType && !answers.acType) scene.equipment = details.scene.equipment;
      else if (scene.equipment && details.scene.equipment) scene.equipment = [
        ...(answers.acType ? scene.equipment : details.scene.equipment).filter(kind => kind.includes("ac")),
        ...(answers.fanType ? scene.equipment : details.scene.equipment).filter(kind => kind.includes("fan")),
      ];
    }
    if (matches(["windowCount"]) && scene.windows && details.scene.windows?.length === scene.windows.length) {
      scene.windows = scene.windows.map((w, i) => ({
        direction: !WINDOW_DIRECTION_IDS.some(id => answers[id]) && matches(["windowOrientation"]) ? details.scene.windows![i]!.direction : w.direction,
        covering: matches(["internalCoverings"]) ? details.scene.windows![i]!.covering : w.covering,
        shade: matches(["externalShading"]) ? details.scene.windows![i]!.shade : w.shade,
      }));
    }
  }
  return scene;
}
export type SceneFocus = "room" | "roof" | "windows" | "cooling" | "none";
export function sceneFocus(questionId: string): SceneFocus {
  if (["position"].includes(questionId)) return "room";
  if (["aboveRoom", "insulation"].includes(questionId)) return "roof";
  if (["windowCount", ...WINDOW_DIRECTION_IDS, "windowOrientation", "externalShading", "internalCoverings", "windowsOpen", "ventilationConstraints"].includes(questionId)) return "windows";
  if (["cooling", ...EQUIPMENT_QUESTION_IDS, "coolingUsage", "servesOnlyRoom"].includes(questionId)) return "cooling";
  return "none";
}
