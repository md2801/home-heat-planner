import test from 'node:test';
import assert from 'node:assert/strict';
import {
  blankShadingScenario, buildSyntheticShadingDay, createReferenceShadingScenario, directions,
  evaluateShadingScenario, isCoolingScheduled, isShadingScenarioDraft, shadingScenarioFields, simulateShadingCase,
  type ShadingScenarioDraft, type ShadingScenarioField, type ShadingScenarioParameters,
} from '../src/features/shading-scenario/model.ts';

function ready(overrides: Partial<ShadingScenarioDraft> = {}) {
  const result = evaluateShadingScenario(createReferenceShadingScenario({ assumptionsAccepted: true, ...overrides }));
  if (result.status !== 'ready') assert.fail([...result.missing, ...result.errors].join(', '));
  return result;
}
function parameters(overrides: Partial<ShadingScenarioParameters> = {}): ShadingScenarioParameters {
  const draft = createReferenceShadingScenario();
  const parsed = Object.fromEntries((Object.keys(shadingScenarioFields) as ShadingScenarioField[]).map((key) => [key, Number(draft[key])])) as ShadingScenarioParameters;
  return { ...parsed, ...overrides };
}
function close(actual: number, expected: number, tolerance = 1e-9) {
  assert.ok(Math.abs(actual - expected) < tolerance, `${actual} should equal ${expected}`);
}

test('new scenarios stay blank and reference assumptions require acceptance', () => {
  const blank = blankShadingScenario('2026-10-04T00:00:00.000Z');
  assert.ok(Object.keys(shadingScenarioFields).every((key) => blank[key as ShadingScenarioField] === ''));
  assert.equal(blank.direction, 'unknown');
  assert.equal(blank.weatherMode, '');
  assert.equal(evaluateShadingScenario(blank).status, 'incomplete');
  const reference = evaluateShadingScenario(createReferenceShadingScenario());
  assert.equal(reference.status, 'incomplete');
  if (reference.status === 'incomplete') assert.deepEqual(reference.missing, ['Confirm the scenario assumptions']);
});

test('unknown, malformed and out-of-range inputs cannot silently become estimates', () => {
  for (const overrides of [
    { windowAreaM2: '' }, { roomVolumeM3: 'unknown' }, { glazingShgc: '1.1' }, { proposedShadePercent: '-1' },
    { cop: 'Infinity' }, { cop: '0' }, { thermalMassMjPerK: '0' }, { coolingStartHour: '1.5' },
    { coolingEndHour: '24' }, { coolingDays: '0' }, { coolingDays: '2.2' }, { coolingDays: '367' },
    { tariffAudPerKwh: '0x1' }, { direction: 'unknown' }, { weatherMode: '' }, { periodLabel: '  ' },
    { installedCostAud: '-20' }, { installedCostAud: 'NaN' },
  ] as Partial<ShadingScenarioDraft>[]) {
    assert.equal(evaluateShadingScenario(createReferenceShadingScenario({ assumptionsAccepted: true, ...overrides })).status, 'incomplete', JSON.stringify(overrides));
  }
});

test('persistence shape allows incomplete strings and rejects unsafe shapes, enums and oversized data', () => {
  const blank = blankShadingScenario();
  assert.equal(isShadingScenarioDraft(blank), true);
  assert.equal(isShadingScenarioDraft({ ...blank, windowAreaM2: '-' }), true);
  for (const invalid of [null, [], { ...blank, version: 2 }, { ...blank, direction: 'N' },
    { ...blank, weatherMode: 'live' }, { ...blank, assumptionsAccepted: 'true' },
    { ...blank, roomVolumeM3: 40 }, { ...blank, periodLabel: 'a'.repeat(201) }, { ...blank, surprise: 'unexpected' },
    { ...blank, installedCostScope: 'a'.repeat(241) }, { ...blank, cop: '1'.repeat(33) },
    { ...blank, updatedAt: 'yesterday' }]) {
    assert.equal(isShadingScenarioDraft(invalid), false);
  }
});

test('constant-load reference matches an independently calculated heat balance', () => {
  // 100 W/K × (35−25) K = 1000 W thermal; 24h / COP4 = 6kWh/day.
  const p = parameters({ fabricWPerK: 100, backgroundAch: 0, internalGainsW: 0, initialTempC: 25,
    setpointC: 25, coolingCapacityKw: 5, cop: 4, coolingStartHour: 0, coolingEndHour: 0,
    tariffAudPerKwh: 0.3, coolingDays: 30 });
  const result = simulateShadingCase(p, Array.from({ length: 24 }, () => ({ outdoorC: 35, incidentWPerM2: 0 })), 0);
  close(result.dailyKwh, 6);
  close(result.periodKwh, 180);
  close(result.periodCostAud, 54);
  close(result.peakIndoorC, 25);
  assert.equal(result.unmetComfortHours, 0);
});

test('no change, no solar and zero SHGC independently produce no shading savings', () => {
  const identical = ready({ existingShadePercent: '40', proposedShadePercent: '40' });
  assert.deepEqual(identical.baseline, identical.improved);
  assert.equal(identical.savingsAud, 0);
  const opaque = ready({ glazingShgc: '0' });
  assert.deepEqual(opaque.baseline, opaque.improved);
  const p = parameters();
  const noSun = Array.from({ length: 24 }, () => ({ outdoorC: 30, incidentWPerM2: 0 }));
  assert.deepEqual(simulateShadingCase(p, noSun, 0), simulateShadingCase(p, noSun, 90));
});

test('solar exposure respects window direction, night and east-west symmetry', () => {
  const east = buildSyntheticShadingDay('east');
  const west = buildSyntheticShadingDay('west');
  assert.ok(east[8]!.incidentWPerM2 > west[8]!.incidentWPerM2);
  assert.ok(west[16]!.incidentWPerM2 > east[16]!.incidentWPerM2);
  for (const direction of directions) {
    const weather = buildSyntheticShadingDay(direction);
    assert.equal(weather.length, 24);
    assert.equal(weather[0]!.incidentWPerM2, 0);
    assert.equal(weather[23]!.incidentWPerM2, 0);
    assert.ok(weather.every((w) => w.outdoorC >= 21 && w.outdoorC <= 35 && w.incidentWPerM2 >= 0));
  }
  close(east.reduce((sum, w) => sum + w.incidentWPerM2, 0), west.reduce((sum, w) => sum + w.incidentWPerM2, 0));
});

test('schedule crosses midnight and equal hours explicitly mean 24 hours', () => {
  assert.deepEqual(Array.from({ length: 24 }, (_, hour) => hour).filter((hour) => isCoolingScheduled(hour, 22, 6)), [0, 1, 2, 3, 4, 5, 22, 23]);
  assert.equal(isCoolingScheduled(6, 22, 6), false);
  assert.equal(isCoolingScheduled(13, 14, 23), false);
  assert.equal(isCoolingScheduled(23, 14, 23), false);
  assert.ok(Array.from({ length: 24 }, (_, hour) => isCoolingScheduled(hour, 0, 0)).every(Boolean));
  const result = ready({ coolingStartHour: '22', coolingEndHour: '6', coolingCapacityKw: '0.1' });
  assert.ok(result.baseline.dailyKwh <= 0.1 * 8 / 3.5 + 1e-9);
  assert.ok(result.baseline.unmetComfortHours <= 8 + 1e-9);
  assert.ok(result.baseline.unmetComfortHours > 0);
});

test('zero cooling capacity consumes no electricity and reports unmet comfort', () => {
  const result = ready({ coolingCapacityKw: '0' });
  assert.equal(result.baseline.dailyKwh, 0);
  assert.equal(result.improved.dailyKwh, 0);
  assert.equal(result.savingsAud, 0);
  assert.ok(result.baseline.unmetComfortHours > 0);
});

test('energy and tariff arithmetic stay separate and scale only by explicit cooling days', () => {
  const result = ready({ coolingDays: '7', tariffAudPerKwh: '0.4' });
  close(result.baseline.periodKwh, result.baseline.dailyKwh * 7);
  close(result.baseline.periodCostAud, result.baseline.periodKwh * 0.4);
  close(result.savingsAud, result.savingsKwh * 0.4);
  const free = ready({ tariffAudPerKwh: '0' });
  assert.equal(free.baseline.periodCostAud, 0);
  assert.equal(free.savingsAud, 0);
  assert.ok(free.savingsKwh > 0);
  assert.equal('annualSavings' in result, false);
  assert.equal('payback' in result, false);
});

test('greater shading reduces energy without reducing the shared comfort target; reverse changes can increase costs', () => {
  const none = ready({ proposedShadePercent: '0' });
  const partial = ready({ proposedShadePercent: '40' });
  const full = ready({ proposedShadePercent: '100' });
  assert.ok(none.improved.dailyKwh > partial.improved.dailyKwh);
  assert.ok(partial.improved.dailyKwh > full.improved.dailyKwh);
  assert.ok(full.improved.unmetComfortHours <= none.improved.unmetComfortHours);
  const reverse = ready({ existingShadePercent: '75', proposedShadePercent: '0' });
  assert.ok(reverse.savingsAud < 0);
  close(reverse.savingsAud, -ready().savingsAud);
});

test('window area and glazing properties change the solar contribution rather than applying a bill percentage', () => {
  const small = ready({ windowAreaM2: '1', coolingCapacityKw: '20', coolingStartHour: '0', coolingEndHour: '0' });
  const large = ready({ windowAreaM2: '5', coolingCapacityKw: '20', coolingStartHour: '0', coolingEndHour: '0' });
  assert.ok(large.savingsKwh > small.savingsKwh);
  const lowerShgc = ready({ glazingShgc: '0.3' });
  assert.ok(lowerShgc.savingsKwh < ready().savingsKwh);
});

test('a solar-only analytical fixture matches area × SHGC × irradiance / COP', () => {
  // Outdoors stays at the setpoint; constant window gain is 2×0.5×400=400W.
  const p = parameters({ windowAreaM2: 2, glazingShgc: 0.5, internalGainsW: 0, initialTempC: 25,
    setpointC: 25, coolingCapacityKw: 5, cop: 4, coolingStartHour: 0, coolingEndHour: 0 });
  const weather = Array.from({ length: 24 }, () => ({ outdoorC: 25, incidentWPerM2: 400 }));
  const before = simulateShadingCase(p, weather, 0);
  const after = simulateShadingCase(p, weather, 75);
  close(before.dailyKwh, 0.4 * 24 / 4);
  close(after.dailyKwh, 0.1 * 24 / 4);
  close(before.dailyKwh - after.dailyKwh, 1.8);
});

test('an installed price needs scope and does not create payback', () => {
  assert.equal(ready({ installedCostAud: '350' }).installedCostAud, null);
  assert.equal(ready({ installedCostAud: '350', installedCostScope: 'My assumed all-in budget' }).installedCostAud, 350);
  assert.equal(ready({ installedCostAud: '0', installedCostScope: 'Existing movable shade; no new spending' }).installedCostAud, 0);
});

test('assumption snapshot retains every numeric input, weather basis and price scope', () => {
  const result = ready({ installedCostAud: '350', installedCostScope: 'Example installed quote', updatedAt: '2026-10-04T00:00:00.000Z' });
  const text = result.assumptions.join('\n');
  for (const [label] of Object.values(shadingScenarioFields)) assert.ok(text.includes(label), label);
  assert.doesNotMatch(text, /2026-10-04T00:00:00.000Z/); // Timestamp is separate provenance, not a material assumption.
  assert.match(text, /Example installed quote/);
  assert.match(text, /650 W\/m²/);
  assert.match(result.limitations.join('\n'), /uncalibrated/);
});
