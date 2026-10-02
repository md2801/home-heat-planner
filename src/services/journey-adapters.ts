import type { PlannerAdapter, PlannerCommand, PlannerResult } from "../contracts/journey.ts";
import { calculationDraft } from "../contracts/journey.ts";
import { isPlannerCommand, isPlannerResult } from "../contracts/validation.ts";
import { coolingOptions } from "../features/cooling-options/model.ts";
import { confirmRoomReview } from "../features/room-baseline/model.ts";
export function executePlanner(command: PlannerCommand): PlannerResult {
  if (!isPlannerCommand(command)) return { ok: false, error: { code: "invalid-input", message: "Review the supplied assessment values.", retryable: false } };
  const input = calculationDraft(command.assessment);
  const draft = command.operation === "confirm" ? confirmRoomReview(input, new Date().toISOString()) : input;
  const view = coolingOptions(draft);
  return { ok: true, data: { profile: view.baseline.profile, currentCoolingCost: view.baseline.result, recommendations: view.journey.recommendations, comparisons: view.journey.comparisons, missingInformation: view.gaps, review: draft.review ?? {} } };
}
export const localPlannerAdapter: PlannerAdapter = { execute: async command => executePlanner(command) };
export function createHttpPlannerAdapter(endpoint = "/api/planner"): PlannerAdapter {
  return { async execute(command) {
    try {
      const response = await fetch(endpoint, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(command), signal: AbortSignal.timeout(15000) });
      const result: unknown = await response.json();
      if (isPlannerResult(result)) return result;
    } catch { /* Retain client state; never expose request bodies or provider diagnostics. */ }
    return { ok: false, error: { code: "unavailable", message: "Could not refresh the assessment. Your answers are still available.", retryable: true } };
  } };
}
