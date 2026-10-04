import type { RewardReason, RewardTask } from "../features/rewards/catalogue.ts";
export type RewardStatus = "checking" | "approved" | "needs-evidence" | "unavailable";
export interface RewardAttempt { id: string; taskId: string; title: string; coins: number; status: RewardStatus; reason: RewardReason | null; createdAt: string; photoCount: number }
export interface RewardEntry { id: string; delta: number; title: string; createdAt: string }
export interface RewardCoupon { id: string; rewardId: string; code: string; coins: number; createdAt: string }
export interface RewardsSnapshot { balance: number; earned: number; completed: number; tasks: RewardTask[]; attempts: RewardAttempt[]; entries: RewardEntry[]; coupons: RewardCoupon[]; assessmentAvailable: boolean }
export interface PhotoDecision { decision: "approve" | "needs-evidence"; reason: Exclude<RewardReason, "service-unavailable"> }
export const photoDecisionSchema = {
  type: "object", additionalProperties: false, required: ["decision", "reason"],
  properties: { decision: { type: "string", enum: ["approve", "needs-evidence"] }, reason: { type: "string", enum: ["visible-action", "unclear", "wrong-task", "before-after", "not-photo", "safety"] } },
} as const;
export function isPhotoDecision(value: unknown): value is PhotoDecision {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const v = value as Record<string, unknown>;
  return Object.keys(v).length === 2 && (v.decision === "approve" && v.reason === "visible-action" || v.decision === "needs-evidence" && ["unclear", "wrong-task", "before-after", "not-photo", "safety"].includes(String(v.reason)));
}
