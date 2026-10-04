"use client";
import { rewardsClient } from "../rewards/client.ts";
import { demoRewards } from "./catalogue.ts";
import type { MarketplaceService } from "./service.ts";
import type { MarketplaceSnapshot, RewardActivity } from "./model.ts";
const initial: MarketplaceSnapshot = { balance: 0, catalogue: demoRewards, activity: [], mode: "connected" };
let snapshot = initial;
const listeners = new Set<() => void>();
function activity(coupon: { id: string; rewardId: string; coins: number; createdAt: string; code: string }): RewardActivity {
  return { id: coupon.id, rewardId: coupon.rewardId, rewardName: demoRewards.find(item => item.id === coupon.rewardId)?.name ?? "Earlier reward", points: coupon.coins, redeemedAt: coupon.createdAt, code: coupon.code };
}
rewardsClient.subscribe(() => {
  const wallet = rewardsClient.getSnapshot().wallet;
  snapshot = wallet ? { ...initial, balance: wallet.balance, activity: wallet.coupons.map(activity) } : initial;
  listeners.forEach(listener => listener());
});
/** Adapter preserves the colleague's service port; PostgreSQL owns every debit. */
export const connectedMarketplaceService: MarketplaceService = {
  subscribe(listener) { listeners.add(listener); return () => { listeners.delete(listener); }; },
  getSnapshot: () => snapshot,
  getServerSnapshot: () => initial,
  async redeem(rewardId) {
    if (!demoRewards.some(item => item.id === rewardId)) return { ok: false, reason: "unknown-reward" };
    try { return { ok: true, activity: activity(await rewardsClient.redeem(rewardId)) }; }
    catch (error) { return { ok: false, reason: error instanceof Error && error.message.includes("more coins") ? "insufficient-points" : "unavailable" }; }
  },
};
