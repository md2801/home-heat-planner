import type { CheckInChoice, CoolingPlanDraft } from "../../domain/cooling-plan.ts";
import type { Fact } from "../../domain/models.ts";
import { unknown } from "../../domain/unknown.ts";
import type { AssessmentDraft } from "../assessment/state.ts";
import { coolingOptions, type CoolingOption } from "../cooling-options/model.ts";
import { contributorEvidence } from "../heat-contributors/evidence.ts";

import { selectedSimpleActions } from "../cooling-options/simple-actions.ts";
import { sources, reviewedOn } from "../knowledge-base/catalogue.ts";

export const CHECKLIST_VERSION = "investigation-checklist-v1";
export interface PlanStep { id: string; title: string; detail: string }
export function planSteps(option: CoolingOption, draft: AssessmentDraft): PlanStep[] {
  const profile = coolingOptions(draft).baseline.profile;
  const quote = profile.willingToObtainQuotes;
  const quoteStep = { id: "quote", title: quote.status === "known" && !quote.value ? "Review your quote preference" : "Get a scoped quote", detail: quote.status === "known" && !quote.value ? "You declined quotes. Gather information first and reconsider a quote before spending." : "Ask a qualified provider for inclusions, installed cost and any recurring costs. No price is assumed." };
  const recordStep = { id: "record", title: "Keep records of your next step", detail: "If you later proceed, keep the installed cost and completion records for your check-in. Nothing is marked installed here." };
  if (option.id === "ac-replacement") return [
    { id: "labels", title: "Check both model labels", detail: "Confirm model pairs, Average-zone cooling energy, same capacity and comparable features. Actual usage may differ from standard label conditions." },
    { id: "sizing", title: "Confirm room sizing and comfort", detail: "Ask a qualified installer to confirm bedroom suitability, noise and comparable cooling service." },
    { id: "permission", title: "Confirm installation permission", detail: "Confirm permission and any electrical, external-unit or shared-building constraints." }, quoteStep, recordStep,
  ];
  if (option.id === "external-shading") return [
    { id: "window", title: "Measure the relevant window", detail: "Record its size and observe direct sun at the hot times you reported. Measure only where safely accessible." },
    { id: "permission", title: profile.externalChangesPermitted.status === "known" && profile.externalChangesPermitted.value ? "Review permission conditions" : "Confirm external-change permission", detail: profile.externalChangesPermitted.status === "known" && profile.externalChangesPermitted.value ? "You reported permission is confirmed. Check any conditions before arranging work." : "Permission is not known. Ask the relevant owner, building manager or authority before external work." },
    { id: "approaches", title: "Compare suitable shading approaches", detail: "Discuss seasonal sun, the window orientation and building constraints with a qualified provider. A shade type has not been selected for you." }, quoteStep, recordStep,
  ];
  if (option.id === "ceiling-insulation") return [
    { id: "records", title: "Check the insulation records", detail: profile.insulation.status === "unknown" ? "Insulation is not known. Check building records or ask a qualified professional; do not assume it is absent." : "You reported no ceiling or roof insulation. Ask a qualified professional to confirm the existing condition." },
    { id: "access", title: "Confirm access and permission", detail: "Confirm ownership and shared-building approvals. Do not enter a roof space yourself." },
    { id: "review", title: "Arrange a professional review", detail: "Ask about suitability, existing construction and safety before considering any installation." }, quoteStep, recordStep,
  ];
  return [
    { id: "limits", title: "Review your opening constraints", detail: "Record which windows can open and the limits you reported. Do not override security, noise or air-quality concerns." },
    { id: "conditions", title: "Check suitable outdoor conditions", detail: "Ventilation depends on cooler outdoor air and safe conditions. Openability alone does not establish airflow or cooling performance." },
    { id: "review", title: "Discuss safe opening options", detail: "Ask a qualified provider or building manager about any proposed alteration and its permission requirements." }, quoteStep, recordStep,
  ];
}
function reported<T>(value: T, recordedAt: string, scope: string): Fact<T> {
  return { status: "known", value, provenance: { kind: "user-reported", recordedAt, sourceIds: [], scope } };
}
export function validCalendarDate(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value;
}
export function localDate(now: string): string {
  const date = new Date(now);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}
export function validCustomDate(value: string, today: string): boolean {
  return validCalendarDate(value) && validCalendarDate(today) && value >= today;
}
function selectionSignature(draft: AssessmentDraft): string { return draft.selectedTechniques?.ids.length ? JSON.stringify([draft.selectedOption, draft.selectedTechniques]) : JSON.stringify(draft.selectedOption); }
export function simplePlanSteps(draft: AssessmentDraft): PlanStep[] {
  return selectedSimpleActions(draft).map(t => ({ id: `technique:${t.id}`, title: t.title, detail: [...t.steps, ...t.checks, t.id === "cooler-air" ? "Close windows while refrigerated AC runs." : ""].filter(Boolean).join(" ") }));
}
function initialPlan(draft: AssessmentDraft, now: string): CoolingPlanDraft | null {
  const option = coolingOptions(draft).selected;
  const actions = selectedSimpleActions(draft);
  if (!option && !actions.length) return null;
  const selectedAt = draft.selectedTechniques?.ids.length ? draft.selectedTechniques.recordedAt : draft.selectedOption!.recordedAt;
  const actionId = option?.id ?? "simple-actions";
  const actionLabel = [option?.title, ...actions.map(t => t.title)].filter(Boolean).join(" + ");
  const actionEvidence = actions.flatMap(t => t.sourceIds.map(id => ({ id: `technique:${id}`, ...sources[id], excerpt: t.benefit, reviewedAt: reviewedOn, contentVersion: "techniques-v1" })));
  const rating = draft.answers.baselineComfortRating;
  const time = draft.answers.baselineComfortTime;
  return { schemaVersion: 1, id: `cooling-plan:${actionId}:${selectedAt}`, selectedActionId: actionId, selectedActionLabel: actionLabel, selectionSignature: selectionSignature(draft), comparisonSnapshot: option ? reported(option.comparison, draft.selectedOption!.recordedAt, "Selected comparison snapshot; enclosed financial provenance and unknowns are preserved") : unknown("Simple actions have no quantified financial comparison"), checklist: [...simplePlanSteps(draft), ...(option ? planSteps(option, draft) : [])].map(step => ({ id: step.id, description: `${step.title}. ${step.detail}`, completed: false })), checkInDate: unknown("No check-in date chosen"), status: "planned", createdAt: now, updatedAt: now, savedAt: unknown("Plan has not been saved"), checkInChoice: unknown("No check-in selected"), financialStatus: option?.status ?? "insufficient-evidence", upfrontCostAud: option?.recommendation.upfrontCostAud ?? unknown("Spending is not established; use existing equipment where suitable"), evidence: [...contributorEvidence.filter(source => option?.recommendation.sourceIds.includes(source.id)), ...actionEvidence].filter((source, i, all) => all.findIndex(item => item.id === source.id) === i), catalogueVersion: option?.recommendation.catalogueVersion ?? "techniques-v1", checklistVersion: CHECKLIST_VERSION, baselineComfortRating: rating?.status === "known" && typeof rating.value === "number" ? { ...rating, value: rating.value } : unknown("Baseline comfort not recorded"), baselineComfortTime: time?.status === "known" && typeof time.value === "string" ? { ...time, value: time.value } : unknown("Baseline time not recorded") };
}
const record = (value: unknown): value is Record<string, unknown> => typeof value === "object" && value !== null && !Array.isArray(value);
const timestamp = (value: unknown): value is string => typeof value === "string" && Number.isFinite(Date.parse(value));
function validReportedFact(value: unknown, validate: (value: unknown) => boolean, scope: string): boolean {
  if (!record(value)) return false;
  if (value.status === "unknown") return typeof value.reason === "string" && !!value.reason.trim();
  return value.status === "known" && validate(value.value) && record(value.provenance) && value.provenance.kind === "user-reported" && timestamp(value.provenance.recordedAt) && value.provenance.scope === scope && Array.isArray(value.provenance.sourceIds) && value.provenance.sourceIds.length === 0;
}
/** Validate mutable fields, then match every immutable fact/snapshot to the selected comparison. */
export function isPlanForSelection(value: unknown, expected: CoolingPlanDraft): value is CoolingPlanDraft {
  if (!record(value) || !timestamp(value.createdAt) || !timestamp(value.updatedAt) || value.updatedAt < value.createdAt || value.schemaVersion !== 1 || !Array.isArray(value.checklist) || value.checklist.length !== expected.checklist.length) return false;
  if (!value.checklist.every((step, i) => record(step) && step.id === expected.checklist[i]!.id && step.description === expected.checklist[i]!.description && typeof step.completed === "boolean")) return false;
  if (!validReportedFact(value.savedAt, timestamp, "Plan saved in this browser") || !validReportedFact(value.checkInDate, v => typeof v === "string" && validCalendarDate(v), "Chosen plan check-in date") || !validReportedFact(value.checkInChoice, v => typeof v === "string" && ["7-days", "14-days", "custom"].includes(v), "Chosen plan check-in interval")) return false;
  if (!record(value.checkInChoice) || !record(value.checkInDate) || (value.checkInChoice.status === "unknown" && value.checkInDate.status !== "unknown") || (value.checkInChoice.status === "known" && value.checkInChoice.value !== "custom" && value.checkInDate.status !== "known")) return false;
  if (value.baselineComfortRating !== undefined && !validReportedFact(value.baselineComfortRating, v => typeof v === "number" && Number.isInteger(v) && v >= 1 && v <= 5, "Bedroom assessment: baselineComfortRating")) return false;
  if (value.baselineComfortTime !== undefined && !validReportedFact(value.baselineComfortTime, v => typeof v === "string" && ["morning", "afternoon", "evening", "overnight"].includes(v), "Bedroom assessment: baselineComfortTime")) return false;
  const mutable = new Set(["createdAt", "updatedAt", "savedAt", "checkInChoice", "checkInDate", "checklist", "baselineComfortRating", "baselineComfortTime"]);
  // Re-reporting identical values may change provenance timestamps, but preserves the original saved evidence.
  const semantic = (v: unknown) => JSON.stringify(v, (key, val) => key === "recordedAt" ? undefined : val);
  return Object.keys(value).every(key => Object.hasOwn(expected, key)) && Object.keys(expected).filter(key => !mutable.has(key)).every(key => semantic(value[key]) === semantic(expected[key as keyof CoolingPlanDraft]));
}
export function coolingPlan(draft: AssessmentDraft, now: string) {
  const optionView = coolingOptions(draft);
  const initial = initialPlan(draft, now);
  const stored: unknown = "coolingPlanDraft" in draft ? draft.coolingPlanDraft : undefined;
  const restored = initial && isPlanForSelection(stored, initial) ? stored : null;
  const plan = restored ?? initial;
  return { option: optionView.selected, plan, steps: [...simplePlanSteps(draft), ...(optionView.selected ? planSteps(optionView.selected, draft) : [])], invalidStoredPlan: stored !== undefined && !!initial && !restored, baseline: optionView.baseline, journey: { ...optionView.journey, plan: plan && plan.savedAt.status === "known" ? reported(plan, plan.savedAt.value, "Saved user cooling plan") : unknown("No saved current plan") } };
}
export function togglePlanStep(plan: CoolingPlanDraft, stepId: string, completed: boolean, now: string): CoolingPlanDraft {
  if (!plan.checklist.some(step => step.id === stepId)) throw new Error("Unknown checklist step");
  return { ...plan, checklist: plan.checklist.map(step => step.id === stepId ? { ...step, completed } : step), updatedAt: now, savedAt: unknown("Plan changes have not been saved") };
}
export function chooseCheckIn(plan: CoolingPlanDraft, choice: CheckInChoice | null, now: string, customDate?: string): CoolingPlanDraft {
  const today = localDate(now);
  if (choice === "custom" && customDate !== undefined && !validCustomDate(customDate, today)) throw new Error("Choose today or a future valid date");
  let date: string | null = customDate ?? null;
  if (choice === "7-days" || choice === "14-days") {
    const d = new Date(`${today}T12:00:00`); d.setDate(d.getDate() + (choice === "7-days" ? 7 : 14)); date = localDate(d.toISOString());
  }
  return { ...plan, checkInChoice: choice ? reported(choice, now, "Chosen plan check-in interval") : unknown("Check-in skipped"), checkInDate: choice && date ? reported(date, now, "Chosen plan check-in date") : unknown(choice === "custom" ? "Choose a custom date" : "Check-in skipped"), updatedAt: now, savedAt: unknown("Plan changes have not been saved") };
}
export function canSavePlan(plan: CoolingPlanDraft): boolean {
  return !(plan.checkInChoice.status === "known" && plan.checkInChoice.value === "custom" && plan.checkInDate.status === "unknown");
}
export function saveCoolingPlan(plan: CoolingPlanDraft, now: string): CoolingPlanDraft {
  if (!canSavePlan(plan)) throw new Error("A valid custom check-in date is required");
  return { ...plan, updatedAt: now, savedAt: reported(now, now, "Plan saved in this browser") };
}
export function planDestination(plan: CoolingPlanDraft | null): "/follow-up" | null {
  return plan?.savedAt.status === "known" && canSavePlan(plan) ? "/follow-up" : null;
}
