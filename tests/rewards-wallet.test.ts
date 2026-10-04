import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { PGlite } from "@electric-sql/pglite";
import { journeyFixture } from "./helpers/journey-fixture.ts";
import { emptyAssessment } from "../src/features/assessment/state.ts";
import { rewardTasks } from "../src/features/rewards/catalogue.ts";
import { createRewardStore } from "../src/server/rewards/store.ts";
async function setup() {
  const db = new PGlite();
  await db.exec(await readFile(new URL("../db/migrations/003_home_rewards.sql", import.meta.url), "utf8"));
  const query = async (text: string, parameters: unknown[]) => (await db.query<Record<string, unknown>>(text, parameters)).rows;
  const store = createRewardStore(query);
  const task = rewardTasks(journeyFixture().draft).find(item => item.id === "close-curtains")!;
  return { db, query, store, task };
}
test("reward eligibility preserves unknowns and the original recommendations", () => {
  assert.deepEqual(rewardTasks(emptyAssessment()), []);
  const tasks = rewardTasks(journeyFixture().draft);
  assert.ok(tasks.some(item => item.id === "close-curtains"));
  assert.ok(!tasks.some(item => item.id === "measure-window"));
  assert.ok(!tasks.some(item => item.id === "fans" || item.id === "clean-filters"));
});
test("approval is atomic, once per task and isolated from other users", async () => {
  const { db, store, task } = await setup();
  try {
    const attempt = await store.begin("a", task, ["hash-a"]);
    assert.equal(attempt.result, "started");
    assert.equal((await store.begin("a", task, ["hash-b"])).result, "already-claimed");
    assert.equal(await store.finish("b", attempt.id, "approved", "visible-action"), "missing");
    await store.finish("a", attempt.id, "approved", "visible-action");
    await store.finish("a", attempt.id, "approved", "visible-action");
    assert.equal((await store.read("a")).balance, task.coins);
    assert.equal((await store.read("a")).entries.length, 1);
    assert.equal((await store.read("b")).balance, 0);
    assert.equal((await store.begin("a", { ...task, id: "other" }, ["hash-a"])).result, "duplicate-proof");
    assert.equal((await store.begin("b", task, ["hash-a"])).result, "started");
  } finally { await db.close(); }
});
test("concurrent coupon requests cannot overspend and retries return one coupon", async () => {
  const { db, store, task, query } = await setup();
  try {
    const attempt = await store.begin("a", { ...task, coins: 450 }, ["fund"]);
    await store.finish("a", attempt.id, "approved", "visible-action");
    const results = await Promise.all([store.redeem("a", "curtain-voucher"), store.redeem("a", "thermometer")]);
    assert.ok(results.includes("insufficient"));
    const wallet = await store.read("a");
    assert.equal(wallet.coupons.length, 1);
    const coupon = wallet.coupons[0]!;
    assert.equal(await store.redeem("a", coupon.rewardId), "existing");
    assert.equal((await store.read("a")).balance, wallet.balance);
    assert.equal(wallet.entries.reduce((sum, entry) => sum + entry.delta, 0), wallet.balance);
    assert.match(coupon.code, /^HHP-DEMO-/);
    await assert.rejects(query("SELECT heat_planner_finish_reward($1,$2::uuid,'approved',NULL,$3::uuid)", ["a", randomUUID(), randomUUID()]));
  } finally { await db.close(); }
});
test("failures allow better evidence, stale attempts never award, daily submissions are bounded", async () => {
  const { db, store, task, query } = await setup();
  try {
    const first = await store.begin("a", task, ["first"]);
    await store.finish("a", first.id, "needs-evidence", "unclear");
    const retry = await store.begin("a", task, ["retry"]);
    await query("UPDATE heat_planner_reward_attempts SET created_at=now()-interval '3 minutes' WHERE id=$1::uuid", [retry.id]);
    assert.equal(await store.finish("a", retry.id, "approved", "visible-action"), "unavailable");
    assert.equal((await store.read("a")).balance, 0);
    for (let n = 0; n < 10; n++) {
      const attempt = await store.begin("a", task, [`attempt-${n}`]);
      assert.equal(attempt.result, "started");
      await store.finish("a", attempt.id, "unavailable", "service-unavailable");
    }
    assert.equal((await store.begin("a", task, ["limit"])).result, "limit");
  } finally { await db.close(); }
});
