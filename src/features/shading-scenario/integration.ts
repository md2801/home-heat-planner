import type { AssessmentDraft } from "../assessment/state.ts";
import type { Comparison, Fact, FinancialResult, Provenance } from "../../domain/models.ts";
import { unknown } from "../../domain/unknown.ts";
import { WINDOW_DIRECTION_IDS } from "../assessment/questions.ts";
import { assessmentScene } from "../room-scene/assessment-scene.ts";
import { blankShadingScenario, evaluateShadingScenario, isShadingScenarioDraft, type ShadingScenarioDraft } from "./model.ts";

export interface SavedShadingScenario { input: ShadingScenarioDraft; roomSignature: string }
export function isSavedShadingScenario(value: unknown): value is SavedShadingScenario {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const v = value as SavedShadingScenario;
  return Object.keys(v).length === 2 && typeof v.roomSignature === "string" && v.roomSignature.length > 0 && v.roomSignature.length <= 12000 && isShadingScenarioDraft(v.input);
}

/** Track only room/energy inputs, independently of the scenario itself or selection. */
export function shadingRoomSignature(draft: Pick<AssessmentDraft, "answers" | "sceneDetails">): string {
  const ids = ["heatTiming", "aboveRoom", "position", "insulation", "windowCount", "windowOrientation", ...WINDOW_DIRECTION_IDS, "externalShading", "internalCoverings", "cooling", "servesOnlyRoom", "externalChangesPermitted", "flatTariffAudPerKwh", "hoursPerDay", "coolingDays", "periodDescription"];
  return JSON.stringify([ids.map(id => { const answer = draft.answers[id]; return [id, answer?.status === "known" ? answer.value : null]; }), draft.sceneDetails ? assessmentScene(draft.answers, draft.sceneDetails).windows : null]);
}

export function hasShadingCooling(draft: AssessmentDraft): boolean {
  const cooling = draft.answers.cooling;
  return cooling?.status === "known" && Array.isArray(cooling.value) && cooling.value.includes("air-conditioner");
}
export function hasRoomOnlyCooling(draft: AssessmentDraft): boolean {
  const serves = draft.answers.servesOnlyRoom;
  return hasShadingCooling(draft) && serves?.status === "known" && serves.value === true;
}
export function currentShadingInput(draft: AssessmentDraft): ShadingScenarioDraft | null {
  return draft.shadingScenario?.roomSignature === shadingRoomSignature(draft) ? draft.shadingScenario.input : null;
}
export function initialShadingInput(draft: AssessmentDraft, now: string): ShadingScenarioDraft {
  const input = blankShadingScenario(now);
  const windows = assessmentScene(draft.answers, draft.sceneDetails).windows;
  const directions = [...new Set(windows?.map(w => w.direction).filter(d => d !== "unknown") ?? [])];
  if (directions.length === 1) input.direction = directions[0]!;
  const shade = draft.answers.externalShading;
  if (shade?.status === "known" && shade.value === "none") input.existingShadePercent = "0";
  for (const [answerId, field] of [["flatTariffAudPerKwh", "tariffAudPerKwh"], ["coolingDays", "coolingDays"]] as const) {
    const answer = draft.answers[answerId];
    if (answer?.status === "known" && typeof answer.value === "number") input[field] = String(answer.value);
  }
  const period = draft.answers.periodDescription;
  if (period?.status === "known" && typeof period.value === "string") input.periodLabel = period.value;
  return input;
}
export function saveShadingInput(draft: AssessmentDraft, input: ShadingScenarioDraft): AssessmentDraft {
  if (!isShadingScenarioDraft(input)) throw new Error("Invalid shading scenario");
  return { ...draft, shadingScenario: { input, roomSignature: shadingRoomSignature(draft) } };
}

/** Called only after the existing shading-investigation eligibility checks pass. */
export function shadingComparison(draft: AssessmentDraft) {
  const input = currentShadingInput(draft);
  const permission = draft.answers.externalChangesPermitted;
  if (!input || !hasRoomOnlyCooling(draft) || permission?.status === "known" && permission.value === false) return null;
  const result = evaluateShadingScenario(input);
  if (result.status !== "ready") return null;
  const provenance: Provenance = { kind: "assumed", recordedAt: input.updatedAt, sourceIds: [], scope: "User-reviewed external-shading scenario; synthetic weather and uncalibrated room model, not measured savings" };
  const known = <T>(value: T): Fact<T> => ({ status: "known", value, provenance });
  const assumptions = result.assumptions.map((description, index) => ({ id: `shading-assumption-${index}`, description, provenance }));
  const financial = (amount: number | null): FinancialResult => ({ status: amount === null ? "insufficient-evidence" : "what-if", amountAud: amount === null ? unknown("This selected-period scenario does not establish annual savings") : known(amount), currency: "AUD", period: known({ kind: "cooling-schedule", coolingDays: result.coolingDays, basis: "stated-period", description: result.periodLabel }), methodVersion: result.methodVersion, inputProvenance: [provenance], assumptions, sourceIds: ["yourhome-shading"], limitations: result.limitations });
  const comparison: Comparison = { optionId: "external-shading", baseline: financial(result.baseline.periodCostAud), proposed: financial(result.improved.periodCostAud), periodSavings: financial(result.savingsAud), energySavingsKwh: known(result.savingsKwh), annualNetSavings: { ...financial(null), period: unknown("No supported annual cooling schedule") }, simplePaybackYears: unknown("A selected-period shading scenario does not establish annual savings or payback"), assumptions };
  return { result, comparison, upfront: result.installedCostAud === null ? unknown("Add an installed cost and its inclusions") : known(result.installedCostAud), costScope: result.installedCostAud === null ? unknown("Scope and price not established") : known(input.installedCostScope) };
}
