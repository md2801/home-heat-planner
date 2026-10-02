import type { CoolingPlanDraft } from "./cooling-plan.ts";
import type { FollowUpCheckIn } from "./follow-up.ts";
import { record, fact, numeric, comparison, stringFact } from "./value-guards.ts";
export interface PlanHistoryEntry { plan: CoolingPlanDraft; checkIns: FollowUpCheckIn[]; archivedAt: string; reason: string }
/** Bounds persisted/transport JSON, including nested facts. Context-specific validators still apply on restore. */
export function safeJson(value: unknown, depth = 0): boolean {
  if (depth > 20) return false;
  if (value === null || typeof value === "boolean") return true;
  if (typeof value === "number") return Number.isFinite(value);
  if (typeof value === "string") return value.length <= 16000;
  if (Array.isArray(value)) return value.length <= 100 && value.every(v => safeJson(v, depth + 1));
  if (typeof value !== "object") return false;
  const object = value as Record<string, unknown>;
  if (Object.keys(object).length > 100 || Object.keys(object).some(k => ["__proto__", "constructor", "prototype"].includes(k))) return false;
  if (object.status === "known" && (!("value" in object) || !object.provenance || typeof object.provenance !== "object")) return false;
  if (object.status === "unknown" && (typeof object.reason !== "string" || !object.reason)) return false;
  return Object.values(object).every(v => safeJson(v, depth + 1));
}
export function isHistory(value: unknown): value is PlanHistoryEntry[] {
  return Array.isArray(value) && value.length <= 50 && safeJson(value) && value.every(e => {
    if (!record(e) || typeof e.reason !== "string" || typeof e.archivedAt !== "string" || !Number.isFinite(Date.parse(e.archivedAt))) return false;
    const plan = e.plan;
    if (!record(plan) || plan.schemaVersion !== 1 || typeof plan.id !== "string" || typeof plan.selectedActionLabel !== "string" || !record(plan.savedAt) || plan.savedAt.status !== "known" || !stringFact(plan.savedAt) || !fact(plan.comparisonSnapshot, comparison) || !fact(plan.upfrontCostAud, numeric)) return false;
    return Array.isArray(e.checkIns) && e.checkIns.every(c => record(c) && c.schemaVersion === 1 && typeof c.id === "string" && typeof c.updatedAt === "string" && c.planId === plan.id && c.interpretation === "observational" && stringFact(c.savedAt) && fact(c.status, v => ["not-started", "started", "completed", "stuck", "deferred"].includes(String(v))) && fact(c.actualCostAud, v => typeof v === "number" && v >= 0) && stringFact(c.note));
  });
}
