import { assessmentScene, type AssessmentSceneDetails } from "../features/room-scene/assessment-scene.ts";
import type { AssessmentAnswers } from "./models.ts";
import type { ReplacementInputs } from "../features/cooling-options/replacement.ts";
import { WINDOW_DIRECTION_IDS, EQUIPMENT_QUESTION_IDS } from "../features/assessment/questions.ts";
export function materialSignature(draft: { answers: AssessmentAnswers; replacement?: ReplacementInputs; sceneDetails?: AssessmentSceneDetails }): string {
  const material = ["heatTiming", "aboveRoom", "windowOrientation", "externalShading", "insulation", "cooling", "windowsOpen", "ventilationConstraints", "externalChangesPermitted", "willingToObtainQuotes", "budgetAud", "servesOnlyRoom", "energyBasis", "coolingKwh", "energyScope", "periodStart", "periodEnd", "averageElectricalInputKw", "hoursPerDay", "coolingDays", "periodDescription", "flatTariffAudPerKwh"];
  const fields = draft.replacement ? Object.entries(draft.replacement.fields).sort(([a], [b]) => a.localeCompare(b)) : null;
  const checks = draft.replacement ? Object.entries(draft.replacement.confirmations).sort(([a], [b]) => a.localeCompare(b)) : null;
  return JSON.stringify([[...material, "windowCount", ...WINDOW_DIRECTION_IDS, ...EQUIPMENT_QUESTION_IDS].map(id => { const f = draft.answers[id]; return [id, f?.status === "known" ? f.value : null]; }), fields, checks, ...(draft.sceneDetails ? [assessmentScene(draft.answers, draft.sceneDetails).windows] : [])]);
}
