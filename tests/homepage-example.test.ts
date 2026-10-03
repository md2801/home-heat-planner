import test from 'node:test';
import assert from 'node:assert/strict';
import { homepageAssumptions, homepageComparison } from '../src/features/thermal-scenario/homepage-example.ts';

test('homepage cost comparison maintains the same target and isolates shading', () => {
  assert.equal(homepageAssumptions.insulation, '0');
  assert.equal(homepageAssumptions.nightAch, homepageAssumptions.ach);
  assert.ok(homepageComparison.comparable);
  for (const run of [homepageComparison.before, homepageComparison.after]) {
    assert.ok(run.temperatures.every(t => Math.abs(t - homepageComparison.target) < 1e-8));
    assert.equal(run.cost, run.electricity * Number(homepageAssumptions.tariff));
  }
  assert.ok(homepageComparison.after.electricity < homepageComparison.before.electricity);
});
