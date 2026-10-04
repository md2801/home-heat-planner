import { profile, financial, recommendation, comparison } from "../domain/value-guards.ts";
import type { PlannerCommand, PlannerResult } from "./journey.ts";
import { calculationDraft } from "./journey.ts";
import { isAssessmentDraft } from "../features/assessment/state.ts";
import { safeJson } from "../domain/history.ts";
export function isPlannerCommand(value: unknown): value is PlannerCommand {
  if (!value || typeof value !== "object" || !safeJson(value)) return false;
  const v = value as PlannerCommand;
  if (v.schemaVersion !== 1 || !["assess", "confirm", "recommend", "compare"].includes(v.operation) || !v.assessment || typeof v.assessment !== "object") return false;
  if (Object.keys(value).some(key => !["schemaVersion", "operation", "assessment"].includes(key)) || Object.keys(v.assessment).some(key => !["answers", "review", "replacement", "sceneDetails", "shadingScenario"].includes(key))) return false;
  try { return isAssessmentDraft(calculationDraft(v.assessment)); } catch { return false; }
}
export function isPlannerResult(value: unknown): value is PlannerResult {
  if (!value || typeof value !== "object" || !safeJson(value)) return false;
  const v = value as PlannerResult;
  if (v.ok === false) return !!v.error && ["invalid-input", "unavailable"].includes(v.error.code) && typeof v.error.message === "string" && typeof v.error.retryable === "boolean";
  if (v.ok !== true || !v.data) return false;
  const d = v.data;
  return profile(d.profile) && (d.currentCoolingCost === null || financial(d.currentCoolingCost)) && Array.isArray(d.recommendations) && d.recommendations.every(recommendation) && Array.isArray(d.comparisons) && d.comparisons.every(comparison) && Array.isArray(d.missingInformation) && d.missingInformation.every(s => typeof s === "string") && isAssessmentDraft({ schemaVersion: 1, answers: {}, currentQuestionId: "heatTiming", completed: false, review: d.review });
}
