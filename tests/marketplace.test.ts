import assert from "node:assert/strict";
import test from "node:test";
import { demoRewards } from "../src/features/marketplace/catalogue.ts";
import { rewardAvailability, rewardCategories } from "../src/features/marketplace/model.ts";
import { createDemoMarketplaceService } from "../src/features/marketplace/service.ts";

test("catalogue has four unique IDs, positive coin costs and real retailer links", () => {
  assert.equal(demoRewards.length, 4);
  assert.equal(new Set(demoRewards.map(r => r.id)).size, demoRewards.length);
  for (const reward of demoRewards) {
    assert.match(reward.id, /^[a-z]+(?:-[a-z]+)*$/);
    assert.ok(Number.isSafeInteger(reward.points) && reward.points > 0);
    assert.ok(rewardCategories.includes(reward.category));
    assert.ok(reward.name && reward.description && reward.detail);
    assert.match(reward.url, /^https:\/\/(www\.)?(bunnings\.com\.au|kmart\.com\.au|ikea\.com)\//);
  }
});
test("affordable reward and insufficient balance expose correct availability", () => {
  const service = createDemoMarketplaceService();
  assert.deepEqual(rewardAvailability(service.getSnapshot(), demoRewards[0]!), { redeemed: false, shortfall: 0, canRedeem: true });
  assert.deepEqual(rewardAvailability({ ...service.getSnapshot(), balance: 100 }, demoRewards[0]!), { redeemed: false, shortfall: 100, canRedeem: false });
});
test("successful redemption subtracts points, creates a receipt and notifies subscribers", async () => {
  const service = createDemoMarketplaceService(() => "2026-10-04T08:00:00Z");
  let notifications = 0;
  const unsubscribe = service.subscribe(() => { notifications++; });
  const result = await service.redeem("pedestal-fan");
  assert.equal(result.ok, true);
  assert.equal(service.getSnapshot().balance, 900);
  assert.deepEqual(service.getSnapshot().activity, [{ id: "demo-pedestal-fan", rewardId: "pedestal-fan", rewardName: "40cm Pedestal Fan — White", points: 350, redeemedAt: "2026-10-04T08:00:00Z" }]);
  assert.equal(notifications, 1);
  unsubscribe();
  await service.redeem("thermometer");
  assert.equal(notifications, 1);
});
test("insufficient and unknown rewards never change balance or activity", async () => {
  const service = createDemoMarketplaceService();
  const before = service.getSnapshot();
  assert.deepEqual(rewardAvailability({ ...before, balance: 0 }, demoRewards[0]!), { redeemed: false, shortfall: 200, canRedeem: false });
  assert.deepEqual(await service.redeem("invented"), { ok: false, reason: "unknown-reward" });
  assert.equal(service.getSnapshot(), before);
});
test("duplicate and concurrent redemptions cannot double debit or overspend", async () => {
  const service = createDemoMarketplaceService();
  const results = await Promise.all([service.redeem("pedestal-fan"), service.redeem("pedestal-fan"), service.redeem("curtain-voucher")]);
  assert.deepEqual(results[1], { ok: false, reason: "already-redeemed" });
  assert.equal(service.getSnapshot().balance, 450);
  assert.equal(service.getSnapshot().activity.length, 2);
  assert.equal(rewardAvailability(service.getSnapshot(), demoRewards[2]!).redeemed, true);
});
test("activity is newest first, a new session resets demo state, and SSR stays stable", async () => {
  const service = createDemoMarketplaceService();
  const initial = service.getServerSnapshot();
  await service.redeem("pedestal-fan");
  await service.redeem("thermometer");
  assert.deepEqual(service.getSnapshot().activity.map(a => a.rewardId), ["thermometer", "pedestal-fan"]);
  assert.equal(service.getSnapshot().balance, 700);
  assert.equal(service.getServerSnapshot(), initial);
  assert.equal(createDemoMarketplaceService().getSnapshot().balance, 1250);
  assert.equal(createDemoMarketplaceService().getSnapshot().activity.length, 0);
});
