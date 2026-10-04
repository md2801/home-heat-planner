import { demoRewards } from "./catalogue.ts";
import { rewardAvailability, type MarketplaceSnapshot, type RedemptionResult } from "./model.ts";

/** UI-facing port only, NOT an agreed backend API or authoritative points ledger.
 * A future adapter can map authenticated balance/catalogue/activity and redemption
 * receipts into this view. The server must validate costs, ownership and duplicates.
 */
export interface MarketplaceService {
  subscribe(listener: () => void): () => void;
  getSnapshot(): MarketplaceSnapshot;
  getServerSnapshot(): MarketplaceSnapshot;
  redeem(rewardId: string): Promise<RedemptionResult>;
}
export const DEMO_POINTS = 1250;
export function createDemoMarketplaceService(now = () => new Date().toISOString()): MarketplaceService {
  const initial: MarketplaceSnapshot = { balance: DEMO_POINTS, catalogue: demoRewards, activity: [], mode: "prototype" };
  let snapshot = initial;
  const listeners = new Set<() => void>();
  return {
    subscribe(listener) { listeners.add(listener); return () => { listeners.delete(listener); }; },
    getSnapshot: () => snapshot,
    getServerSnapshot: () => initial,
    async redeem(rewardId) {
      const reward = snapshot.catalogue.find(entry => entry.id === rewardId);
      if (!reward) return { ok: false, reason: "unknown-reward" };
      const availability = rewardAvailability(snapshot, reward);
      if (availability.redeemed) return { ok: false, reason: "already-redeemed" };
      if (!availability.canRedeem) return { ok: false, reason: "insufficient-points" };
      const activity = { id: `demo-${reward.id}`, rewardId, rewardName: reward.name, points: reward.points, redeemedAt: now() };
      // Update synchronously before returning: rapid/concurrent clicks cannot overspend.
      snapshot = { ...snapshot, balance: snapshot.balance - reward.points, activity: [activity, ...snapshot.activity] };
      listeners.forEach(listener => listener());
      return { ok: true, activity };
    },
  };
}
// Browser module lifetime only: retained across navigation, reset by a full refresh.
// No localStorage, cookies, network requests or journey persistence are involved.
export const demoMarketplaceService = createDemoMarketplaceService();
