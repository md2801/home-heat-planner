import type { FollowUpCheckIn, FollowUpStatus } from "../../domain/follow-up.ts";
import type { CoolingPlanDraft } from "../../domain/cooling-plan.ts";
import type { Fact } from "../../domain/models.ts";
import { unknown } from "../../domain/unknown.ts";
import type { AssessmentDraft } from "../assessment/state.ts";
import { coolingPlan, localDate } from "../cooling-plan/model.ts";

export const statusChoices = [
  { value: "not-started", label: "Not started", icon: "○" },
  { value: "started", label: "Started", icon: "◐" },
  { value: "completed", label: "Completed", icon: "✓" },
  { value: "stuck", label: "I’m stuck", icon: "⚑" },
] as const;
export type NumericField = "actualCostAud" | "currentHoursPerDay" | "comfortRating";
export function reported<T>(value: T, now: string, field: string): Fact<T> {
  return { status: "known", value, provenance: { kind: "user-reported", recordedAt: now, sourceIds: [], scope: `Cooling plan check-in: ${field}` } };
}
export function validNumber(field: NumericField, value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 && (field !== "currentHoursPerDay" || value <= 24) && (field !== "comfortRating" || Number.isInteger(value) && value >= 1 && value <= 5);
}
export function numericInput(field: NumericField, raw: string) {
  if (!raw.trim()) return { value: null, error: null };
  const value = Number(raw);
  const valid = /^[+]?(\d+(\.\d*)?|\.\d+)$/.test(raw.trim()) && validNumber(field, value);
  return valid ? { value, error: null } : { value: null, error: field === "actualCostAud" ? "Enter a non-negative amount, or leave blank." : field === "currentHoursPerDay" ? "Enter hours from 0 to 24, or leave blank." : "Choose a rating from 1 to 5." };
}
function signature(plan: CoolingPlanDraft): string {
  return JSON.stringify([plan.id, plan.selectionSignature, plan.comparisonSnapshot, plan.upfrontCostAud]);
}
function initial(plan: CoolingPlanDraft, draft: AssessmentDraft, now: string): FollowUpCheckIn {
  const hours = draft.answers.hoursPerDay;
  const earlier = hours?.status === "known" && validNumber("currentHoursPerDay", hours.value) ? { ...hours, value: hours.value } : unknown("Earlier numeric cooling hours were not supplied");
  return { schemaVersion: 1, id: `check-in:${plan.id}`, planId: plan.id, actionId: plan.selectedActionId, actionLabel: plan.selectedActionLabel, planSignature: signature(plan), status: unknown("No progress status selected"), actualCostAud: unknown(), currentHoursPerDay: unknown(), comfortRating: unknown(), note: unknown(), earlierHoursPerDay: earlier, comparableUsageConfirmed: unknown("Comparable actual usage not confirmed"), createdAt: now, updatedAt: now, savedAt: unknown("Check-in not saved"), interpretation: "observational" };
}
const record = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);
const timestamp = (v: unknown): v is string => typeof v === "string" && Number.isFinite(Date.parse(v));
function validFact(value: unknown, field: string, guard: (v: unknown) => boolean): boolean {
  if (!record(value)) return false;
  if (value.status === "unknown") return typeof value.reason === "string" && !!value.reason.trim();
  return value.status === "known" && guard(value.value) && record(value.provenance) && value.provenance.kind === "user-reported" && timestamp(value.provenance.recordedAt) && value.provenance.scope === `Cooling plan check-in: ${field}` && Array.isArray(value.provenance.sourceIds) && value.provenance.sourceIds.length === 0;
}
export function isCheckInForPlan(value: unknown, expected: FollowUpCheckIn): value is FollowUpCheckIn {
  if (!record(value) || !timestamp(value.createdAt) || !timestamp(value.updatedAt) || value.updatedAt < value.createdAt) return false;
  const mutable = new Set(["status", "actualCostAud", "currentHoursPerDay", "comfortRating", "note", "comparableUsageConfirmed", "createdAt", "updatedAt", "savedAt"]);
  if (Object.keys(value).some(key => !Object.hasOwn(expected, key)) || Object.keys(expected).filter(key => !mutable.has(key)).some(key => JSON.stringify(value[key]) !== JSON.stringify(expected[key as keyof FollowUpCheckIn]))) return false;
  if (!validFact(value.status, "status", v => statusChoices.some(s => s.value === v)) || !validFact(value.savedAt, "savedAt", timestamp) || !validFact(value.note, "note", v => typeof v === "string" && !!v.trim() && v.length <= 500) || !validFact(value.comparableUsageConfirmed, "comparableUsageConfirmed", v => typeof v === "boolean")) return false;
  if (!( ["actualCostAud", "currentHoursPerDay", "comfortRating"] as const).every(field => validFact(value[field], field, v => validNumber(field, v)))) return false;
  const status = value.status as Fact<FollowUpStatus>;
  if (status.status !== "known" || status.value !== "completed") {
    if (["actualCostAud", "currentHoursPerDay", "comfortRating", "comparableUsageConfirmed"].some(field => (value[field] as Fact<unknown>).status !== "unknown")) return false;
    if ((status.status === "unknown" || status.value === "not-started") && (value.note as Fact<string>).status !== "unknown") return false;
  }
  if ((value.comparableUsageConfirmed as Fact<boolean>).status === "known" && expected.earlierHoursPerDay.status !== "known") return false;
  return (value.savedAt as Fact<string>).status !== "known" || status.status === "known";
}
export function followUp(draft: AssessmentDraft, now: string) {
  const planView = coolingPlan(draft, now);
  const plan = planView.plan?.savedAt.status === "known" ? planView.plan : null;
  const expected = plan ? initial(plan, draft, now) : null;
  const stored: unknown = "followUpCheckIn" in draft ? draft.followUpCheckIn : undefined;
  const restored = expected && isCheckInForPlan(stored, expected) ? stored : null;
  const checkIn = restored ?? expected;
  const due = plan?.checkInDate.status === "known" && plan.checkInDate.value <= localDate(now);
  return { ...planView, plan, checkIn, invalidStoredCheckIn: !!expected && stored !== undefined && !restored, due };
}
function edited(checkIn: FollowUpCheckIn, now: string): FollowUpCheckIn { return { ...checkIn, updatedAt: now, savedAt: unknown("Check-in changes not saved") }; }
export function changeStatus(checkIn: FollowUpCheckIn, status: FollowUpStatus, now: string): FollowUpCheckIn {
  if (!statusChoices.some(s => s.value === status)) throw new Error("Invalid progress status");
  if (checkIn.status.status === "known" && checkIn.status.value === status) return checkIn;
  return { ...edited(checkIn, now), status: reported(status, now, "status"), actualCostAud: unknown(), currentHoursPerDay: unknown(), comfortRating: unknown(), comparableUsageConfirmed: unknown("Comparable actual usage not confirmed"), note: unknown() };
}
export function updateNumber(checkIn: FollowUpCheckIn, field: NumericField, value: number | null, now: string): FollowUpCheckIn {
  if (checkIn.status.status !== "known" || checkIn.status.value !== "completed" || (value !== null && !validNumber(field, value))) throw new Error("Invalid observation");
  const next = edited(checkIn, now);
  if (field === "comfortRating") return { ...next, comfortRating: value === null ? unknown() : reported(value as 1 | 2 | 3 | 4 | 5, now, field) };
  return { ...next, [field]: value === null ? unknown() : reported(value, now, field) };
}
export function updateNote(checkIn: FollowUpCheckIn, note: string, now: string): FollowUpCheckIn {
  if (note.length > 500 || checkIn.status.status !== "known" || checkIn.status.value === "not-started") throw new Error("Invalid note");
  return { ...edited(checkIn, now), note: note.trim() ? reported(note.trim(), now, "note") : unknown() };
}
export function confirmComparableUsage(checkIn: FollowUpCheckIn, confirmed: boolean, now: string): FollowUpCheckIn {
  if (checkIn.status.status !== "known" || checkIn.status.value !== "completed" || checkIn.earlierHoursPerDay.status !== "known") throw new Error("Earlier hours unavailable");
  return { ...edited(checkIn, now), comparableUsageConfirmed: reported(confirmed, now, "comparableUsageConfirmed") };
}
export function observedUsage(checkIn: FollowUpCheckIn) {
  const before = checkIn.earlierHoursPerDay, after = checkIn.currentHoursPerDay, confirmed = checkIn.comparableUsageConfirmed;
  if (checkIn.status.status !== "known" || checkIn.status.value !== "completed" || before.status !== "known" || after.status !== "known" || confirmed.status !== "known" || !confirmed.value) return null;
  return { before: before.value, now: after.value, difference: Math.round((after.value - before.value) * 100) / 100 };
}
export function saveCheckIn(checkIn: FollowUpCheckIn, now: string): FollowUpCheckIn {
  if (checkIn.status.status !== "known" || !isCheckInForPlan(checkIn, checkIn)) throw new Error("Choose a valid progress status before saving");
  return { ...checkIn, updatedAt: now, savedAt: reported(now, now, "savedAt") };
}
