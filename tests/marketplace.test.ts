import assert from "node:assert/strict";
import test from "node:test";
import { demoRewards } from "../src/features/marketplace/catalogue.ts";
import { rewardAvailability, rewardCategories } from "../src/features/marketplace/model.ts";
import { createDemoMarketplaceService } from "../src/features/marketplace/service.ts";

test("catalogue has ten unique stable IDs, positive integer point costs and valid categories", () => {
  assert.equal(demoRewards.length, 10);
  assert.equal(new Set(demoRewards.map(r => r.id)).size, demoRewards.length);
  for (const reward of demoRewards) {
    assert.match(reward.id, /^[a-z]+(?:-[a-z]+)*$/);
    assert.ok(Number.isSafeInteger(reward.points) && reward.points > 0);
    assert.ok(rewardCategories.includes(reward.category));
    assert.ok(reward.name && reward.description && reward.detail);
  }
});
test("affordable reward and insufficient balance expose correct availability", () => {
  const service = createDemoMarketplaceService();
  assert.deepEqual(rewardAvailability(service.getSnapshot(), demoRewards[0]!), { redeemed: false, shortfall: 0, canRedeem: true });
  assert.deepEqual(rewardAvailability(service.getSnapshot(), demoRewards[9]!), { redeemed: false, shortfall: 250, canRedeem: false });
});
test("successful redemption subtracts points, creates a receipt and notifies subscribers", async () => {
  const service = createDemoMarketplaceService(() => "2026-10-04T08:00:00Z");
  let notifications = 0;
  const unsubscribe = service.subscribe(() => { notifications++; });
  const result = await service.redeem("pedestal-fan");
  assert.equal(result.ok, true);
  assert.equal(service.getSnapshot().balance, 600);
  assert.deepEqual(service.getSnapshot().activity, [{ id: "demo-pedestal-fan", rewardId: "pedestal-fan", rewardName: "Energy-efficient pedestal fan", points: 650, redeemedAt: "2026-10-04T08:00:00Z" }]);
  assert.equal(notifications, 1);
  unsubscribe();
  await service.redeem("energy-plug");
  assert.equal(notifications, 1);
});
test("insufficient and unknown rewards never change balance or activity", async () => {
  const service = createDemoMarketplaceService();
  const before = service.getSnapshot();
  assert.deepEqual(await service.redeem("efficiency-voucher"), { ok: false, reason: "insufficient-points" });
  assert.deepEqual(await service.redeem("invented"), { ok: false, reason: "unknown-reward" });
  assert.equal(service.getSnapshot(), before);
});
test("duplicate and concurrent redemptions cannot double debit or overspend", async () => {
  const service = createDemoMarketplaceService();
  const results = await Promise.all([service.redeem("pedestal-fan"), service.redeem("pedestal-fan"), service.redeem("curtain-voucher")]);
  assert.deepEqual(results.slice(1), [{ ok: false, reason: "already-redeemed" }, { ok: false, reason: "insufficient-points" }]);
  assert.equal(service.getSnapshot().balance, 600);
  assert.equal(service.getSnapshot().activity.length, 1);
  assert.equal(rewardAvailability(service.getSnapshot(), demoRewards[0]!).redeemed, true);
});
test("activity is newest first, a new session resets demo state, and SSR stays stable", async () => {
  const service = createDemoMarketplaceService();
  const initial = service.getServerSnapshot();
  await service.redeem("pedestal-fan");
  await service.redeem("energy-plug");
  assert.deepEqual(service.getSnapshot().activity.map(a => a.rewardId), ["energy-plug", "pedestal-fan"]);
  assert.equal(service.getSnapshot().balance, 200);
  assert.equal(service.getServerSnapshot(), initial);
  assert.equal(createDemoMarketplaceService().getSnapshot().balance, 1250);
  assert.equal(createDemoMarketplaceService().getSnapshot().activity.length, 0);
});
