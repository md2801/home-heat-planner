import type { JourneyInput, PlanSaveRequest, CheckInSaveRequest } from "../../contracts/journey.ts";
import { calculationDraft } from "../../contracts/journey.ts";
import { isPlannerCommand } from "../../contracts/validation.ts";
import { safeJson } from "../../domain/history.ts";
import { record } from "../../domain/value-guards.ts";
import { isAssessmentDraft } from "../../features/assessment/state.ts";
import type { AssessmentDraft } from "../../features/assessment/state.ts";
import { reviewSignature, canConfirmMeasuredScope } from "../../features/room-baseline/model.ts";
import type { CoolingPlanDraft } from "../../domain/cooling-plan.ts";
import { materialSignature } from "../../domain/material-signature.ts";
import type { SavedJourney } from "./types.ts";

export function isJourneyInput(value: unknown): value is JourneyInput {
  if (!record(value) || Object.keys(value).length !== 2 || !isPlannerCommand({ ...value, operation: "assess" })) return false;
  const input = value as unknown as JourneyInput;
  const draft = calculationDraft(input.assessment);
  // A stale confirmation must not be restored as confirmed room information.
  return (!draft.review?.room || draft.review.room.signature === reviewSignature(draft, "room")) &&
    (!draft.review?.measuredScope || canConfirmMeasuredScope(draft) && draft.review.measuredScope.signature === reviewSignature(draft, "measuredScope"));
}
export function isPlanSaveRequest(value: unknown, id: string): value is PlanSaveRequest {
  return record(value) && Object.keys(value).length === 2 && value.assessmentId === id && record(value.plan) && safeJson(value);
}
export function isCheckInSaveRequest(value: unknown, id: string): value is CheckInSaveRequest {
  return record(value) && Object.keys(value).length === 2 && value.assessmentId === id && record(value.checkIn) && safeJson(value);
}
/** Existing plans encode their selection here. Reuse it without extending AssessmentInput. */
export function selectionForPlan(assessment: SavedJourney["assessment"], plan: CoolingPlanDraft): SavedJourney["selection"] | null {
  try {
    const value: unknown = JSON.parse(plan.selectionSignature);
    const pair = Array.isArray(value) ? value : [value, undefined];
    if (pair.length !== 2 || !safeJson(value)) return null;
    const option = pair[0], techniques = pair[1];
    const keys = (v: unknown, allowed: string[]) => v === null || v === undefined || record(v) && Object.keys(v).length === allowed.length && allowed.every(k => Object.hasOwn(v, k));
    if (!keys(option, ["actionId", "assessmentSignature", "recordedAt"]) || !keys(techniques, ["ids", "assessmentSignature", "recordedAt"])) return null;
    const selection = { ...(option ? { selectedOption: option } : {}), ...(techniques ? { selectedTechniques: techniques } : {}) };
    const draft = { ...calculationDraft(assessment), ...selection };
    if (!isAssessmentDraft(draft)) return null;
    const signature = materialSignature(draft);
    if (draft.selectedOption && draft.selectedOption.assessmentSignature !== signature || draft.selectedTechniques && draft.selectedTechniques.assessmentSignature !== signature) return null;
    return selection as Pick<AssessmentDraft, "selectedOption" | "selectedTechniques">;
  } catch { return null; }
}
