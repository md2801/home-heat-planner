export const rewardCategories = ["All", "Home comfort", "Energy"] as const;
export type RewardCategory = Exclude<(typeof rewardCategories)[number], "All">;
export interface MarketplaceReward {
  id: string;
  name: string;
  description: string;
  detail: string;
  category: RewardCategory;
  points: number;
  retailer: string;
  url: string;
}
export interface RewardActivity {
  id: string;
  rewardId: string;
  rewardName: string;
  points: number;
  redeemedAt: string;
  code?: string;
}
export interface MarketplaceSnapshot {
  balance: number;
  catalogue: readonly MarketplaceReward[];
  activity: readonly RewardActivity[];
  mode: "prototype" | "connected";
}
export function rewardAvailability(snapshot: MarketplaceSnapshot, reward: MarketplaceReward) {
  const redeemed = snapshot.activity.some(entry => entry.rewardId === reward.id);
  const shortfall = Math.max(0, reward.points - snapshot.balance);
  return { redeemed, shortfall, canRedeem: !redeemed && shortfall === 0 };
}
export type RedemptionResult =
  | { ok: true; activity: RewardActivity }
  | { ok: false; reason: "insufficient-points" | "already-redeemed" | "unknown-reward" | "unavailable" };
