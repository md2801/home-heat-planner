import test from 'node:test';
import assert from 'node:assert/strict';
import { blankDraft, exampleDraft, heatStep, parse, simulate } from '../src/features/thermal-scenario/model.ts';

test('heat balance preserves equilibrium and follows analytical decay', () => {
  assert.ok(Math.abs(heatStep(30, 20, 1000, 100, 1e6, 0) - 30) < 1e-10);
  assert.ok(Math.abs(heatStep(30, 20, 0, 100, 1e6, 0) - (20 + 10 * Math.exp(-0.03))) < 1e-10);
});
test('unchanged parameters yield identical temperature and electricity', () => {
  const r = simulate({ ...exampleDraft(), shade: '0', insulation: '0', nightAch: '0.5' });
  assert.deepEqual(r.baseline, r.improved);
  assert.deepEqual(r.baselineAc, r.improvedAc);
});
test('zero capacity uses no electricity and cannot cool', () => {
  const r = simulate({ ...exampleDraft(), cooling: '0' });
  assert.deepEqual(r.baseline, r.baselineAc);
});
test('AC electricity obeys capacity limit and tariff arithmetic', () => {
  const r = simulate({ ...exampleDraft(), cooling: '100' });
  assert.ok(r.baselineAc.electricity <= 0.1 * 24 / 3.5 + 1e-10);
  assert.ok(r.baselineAc.aboveSetpointHours > 0);
  assert.equal(r.baselineAc.cost, r.baselineAc.electricity * 0.35);
});
test('reducing solar gains alone reduces this example peak and cooling energy', () => {
  const r = simulate({ ...exampleDraft(), insulation: '0', nightAch: '0.5' });
  assert.ok(r.improved.peak < r.baseline.peak);
  assert.ok(r.improvedAc.electricity < r.baselineAc.electricity);
});
test('night ventilation is disabled when outdoor air is warmer', () => {
  const r = simulate({ ...exampleDraft(), shade: '0', insulation: '0', internal: '0', weather: Array(24).fill('40,0').join('\n') });
  assert.deepEqual(r.baseline, r.improved);
});
test('missing and malformed inputs fail instead of becoming zero', () => {
  assert.throws(() => parse(blankDraft()), /Room volume/);
  assert.throws(() => parse({ ...exampleDraft(), tariff: '' }), /Electricity rate/);
  assert.throws(() => parse({ ...exampleDraft(), weather: '30,0' }), /24 rows/);
  assert.throws(() => parse({ ...exampleDraft(), weather: Array(24).fill('30,').join('\n') }), /row 1/);
  assert.throws(() => parse({ ...exampleDraft(), capacity: 'Infinity' }), /thermal capacity/);
});
