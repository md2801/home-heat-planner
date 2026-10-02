import assert from "node:assert/strict";
import test from "node:test";
import type { BaselineInputs, Fact, FinancialResult } from "../src/domain/models.ts";
import { calculateCoolingCost, calculateSimplePayback } from "../src/lib/calculations/financial.ts";
import { unknown } from "../src/domain/unknown.ts";

// PRD verification fixtures only. Never used as default household inputs.
function known<T>(value: T): Fact<T> {
  return { status: "known", value, provenance: { kind: "assumed", recordedAt: "2026-10-02", sourceIds: [], scope: "Explicit PRD test assumption" } };
}
function scenario(hours = 6): BaselineInputs {
  return {
    energy: { kind: "electrical-input-scenario", averageElectricalInputKw: known(1), hoursPerDay: known(hours), coolingDays: known(30) },
    flatTariffAudPerKwh: known(0.30),
    period: known({ kind: "cooling-schedule", coolingDays: 30, basis: "stated-period", description: "PRD illustrative thirty-day period" }),
    bedroomAttribution: known({ description: "Explicit room-specific test scenario", sourceIds: [] }),
  };
}
function amount(result: FinancialResult): number {
  assert.equal(result.amountAud.status, "known");
  if (result.amountAud.status !== "known" || typeof result.amountAud.value !== "number") throw new Error("Expected numeric result");
  return result.amountAud.value;
}

test("PRD scenarios calculate 54 and 36 AUD, labelled what-if", () => {
  const sixHours = calculateCoolingCost(scenario());
  const fourHours = calculateCoolingCost(scenario(4));
  assert.equal(amount(sixHours), 54);
  assert.equal(amount(fourHours), 36);
  assert.equal(amount(sixHours) - amount(fourHours), 18);
  assert.equal(sixHours.status, "what-if");
  assert.equal(fourHours.status, "what-if");
  assert.equal(amount(calculateCoolingCost(scenario(8))), 72);
});

test("missing input, attribution and invalid numbers yield no estimate; zero remains zero", () => {
  const inputs = scenario();
  assert.equal(amount(calculateCoolingCost(scenario(0))), 0);
  assert.equal(calculateCoolingCost({ ...inputs, flatTariffAudPerKwh: unknown() }).amountAud.status, "unknown");
  assert.equal(calculateCoolingCost({ ...inputs, bedroomAttribution: unknown() }).status, "insufficient-evidence");
  for (const tariff of [-1, Infinity, NaN]) assert.equal(calculateCoolingCost({ ...inputs, flatTariffAudPerKwh: known(tariff) }).amountAud.status, "unknown");
  assert.equal(calculateCoolingCost(scenario(25)).status, "insufficient-evidence");
});

test("measured energy retains the stated period; conflicting schedules and unsourced power fail", () => {
  const inputs = scenario();
  const measured = calculateCoolingCost({ ...inputs, energy: { kind: "measured", coolingKwh: known(100) } });
  assert.equal(amount(measured), 30);
  assert.deepEqual(measured.period, inputs.period);
  assert.equal(calculateCoolingCost({ ...inputs, period: known({ kind: "cooling-schedule", coolingDays: 31, basis: "annual", description: "Conflicting days" }) }).status, "insufficient-evidence");
  const power = known(1);
  if (power.status !== "known") throw new Error("Expected known fixture");
  assert.equal(calculateCoolingCost({ ...inputs, energy: { kind: "electrical-input-scenario", averageElectricalInputKw: { ...power, provenance: { ...power.provenance, kind: "sourced" } }, hoursPerDay: known(6), coolingDays: known(30) } }).status, "insufficient-evidence");
});

test("payback requires supported positive annual net savings and nonzero upfront cost", () => {
  // PRD fixture: 80 AUD avoided cost less 20 AUD additional recurring cost = 60 AUD.
  const annual: FinancialResult = {
    ...calculateCoolingCost(scenario()), status: "supported-estimate", amountAud: known(80 - 20),
    period: known({ kind: "cooling-schedule", coolingDays: 30, basis: "annual", description: "Explicit annual PRD fixture" }),
  };
  const payback = calculateSimplePayback(known(300), annual);
  assert.equal(payback.status, "calculated");
  if (payback.status === "calculated") assert.equal(payback.years, 5);
  for (const value of [0, -20, NaN]) assert.equal(calculateSimplePayback(known(300), { ...annual, amountAud: known(value) }).status, "unavailable");
  assert.equal(calculateSimplePayback(known(0), annual).status, "unavailable");
  assert.equal(calculateSimplePayback(unknown(), annual).status, "unavailable");
  assert.equal(calculateSimplePayback(known(300), { ...annual, status: "what-if" }).status, "unavailable");
  assert.equal(calculateSimplePayback(known(300), { ...annual, period: scenario().period }).status, "unavailable");
});
