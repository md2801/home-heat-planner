import assert from "node:assert/strict";
import test from "node:test";
import type { AnswerValue } from "../src/domain/models.ts";
import { emptyAssessment, isAssessmentDraft, type AssessmentDraft } from "../src/features/assessment/state.ts";
import { answer, at, later } from "./helpers/journey-fixture.ts";
import { createReferenceShadingScenario } from "../src/features/shading-scenario/model.ts";
import { currentShadingInput, initialShadingInput, saveShadingInput, shadingComparison } from "../src/features/shading-scenario/integration.ts";
import { coolingOptions, selectCoolingOption } from "../src/features/cooling-options/model.ts";
import { coolingPlan, saveCoolingPlan } from "../src/features/cooling-plan/model.ts";
import { materialSignature } from "../src/domain/material-signature.ts";
import { financialSummary } from "../src/features/cooling-options/financial-summary.ts";
import { createAssessmentRepository } from "../src/features/assessment/repository.ts";
import { createBrowserPersistence } from "../src/lib/persistence/browser-storage.ts";
import { assessmentInput } from "../src/contracts/journey.ts";
import { executePlanner } from "../src/services/journey-adapters.ts";
import { isPlannerResult } from "../src/contracts/validation.ts";
import { validAccountDraft } from "../src/server/account/store.ts";

function room(overrides: Record<string, AnswerValue | null> = {}): AssessmentDraft {
  let draft = emptyAssessment();
  for (const [id, value] of Object.entries({ heatTiming: ["afternoon"], windowCount: 1, window1Orientation: "west", externalShading: "none", cooling: ["air-conditioner"], servesOnlyRoom: true, energyBasis: "scenario", externalChangesPermitted: true, ...overrides })) draft = answer(draft, id, value);
  return draft;
}
function scenario(draft = room()) {
  return saveShadingInput(draft, createReferenceShadingScenario({ updatedAt: at, assumptionsAccepted: true, installedCostAud: "350", installedCostScope: "User assumption: shade plus installation" }));
}
test("eligible shading receives selected-period scenario savings while annual savings remain unknown", () => {
  const draft = scenario();
  const option = coolingOptions(draft).options.find(o => o.id === "external-shading")!;
  assert.equal(option.status, "what-if");
  assert.equal(option.comparison.periodSavings?.amountAud.status, "known");
  assert.equal(option.comparison.energySavingsKwh?.status, "known");
  assert.equal(option.comparison.annualNetSavings.amountAud.status, "unknown");
  assert.equal(option.comparison.simplePaybackYears.status, "unknown");
  const summary = financialSummary(option.comparison, option.recommendation.upfrontCostAud);
  assert.match(summary.savings, /30 cooling days.*what-if/);
  assert.doesNotMatch(summary.savings, /\/yr/);
  const output = executePlanner({ schemaVersion: 1, operation: "compare", assessment: assessmentInput(draft) });
  assert.ok(isPlannerResult(output));
  assert.equal(validAccountDraft(draft), true);
});
test("no AC, shared/unknown room scope, forbidden work and ineligible shade never expose money savings", () => {
  for (const values of [{ cooling: ["none"] }, { cooling: ["fan"] }, { cooling: null }, { servesOnlyRoom: false }, { servesOnlyRoom: null }, { externalChangesPermitted: false }, { externalShading: "all" }]) {
    const draft = scenario(room(values));
    const option = coolingOptions(draft).options.find(o => o.id === "external-shading");
    assert.equal(option?.shadingScenario, undefined);
    assert.equal(option?.comparison.periodSavings, undefined);
  }
});
test("blank/edited assumptions and changed room facts withdraw prior results", () => {
  const draft = scenario();
  assert.ok(shadingComparison(draft));
  assert.equal(shadingComparison(saveShadingInput(draft, { ...draft.shadingScenario!.input, assumptionsAccepted: false })), null);
  assert.equal(shadingComparison(saveShadingInput(draft, { ...draft.shadingScenario!.input, windowAreaM2: "" })), null);
  const changed = answer(draft, "flatTariffAudPerKwh", 0.4, later);
  assert.equal(currentShadingInput(changed), null);
  assert.equal(shadingComparison(changed), null);
  assert.equal(initialShadingInput(changed, later).tariffAudPerKwh, "0.4");
  assert.equal(initialShadingInput(changed, later).windowAreaM2, "");
});
test("known prefill preserves unknown building properties and never uses the illustration as measurements", () => {
  const initial = initialShadingInput(room({ flatTariffAudPerKwh: 0, coolingDays: 20, periodDescription: "My stated hot days" }), at);
  assert.equal(initial.direction, "west");
  assert.equal(initial.existingShadePercent, "0");
  assert.equal(initial.tariffAudPerKwh, "0");
  assert.equal(initial.coolingDays, "20");
  assert.equal(initial.periodLabel, "My stated hot days");
  assert.equal(initial.roomVolumeM3, "");
  assert.equal(initial.glazingShgc, "");
  assert.equal(initial.weatherMode, "");
  assert.equal(initial.assumptionsAccepted, false);
});
test("saved scenario survives reload, archives original comparison after edits, and ignores timestamp-only changes", () => {
  const data = new Map<string, string>();
  const persistence = createBrowserPersistence("shading-plan", isAssessmentDraft, () => ({ getItem: key => data.get(key) ?? null, setItem: (key, value) => { data.set(key, value); }, removeItem: key => { data.delete(key); } }));
  const store = createAssessmentRepository(persistence);
  const chosen = selectCoolingOption(scenario(), "external-shading", at);
  const plan = saveCoolingPlan(coolingPlan(chosen, at).plan!, at);
  store.save({ ...chosen, coolingPlanDraft: plan });
  const reloaded = createAssessmentRepository(persistence); reloaded.hydrate();
  assert.deepEqual(coolingPlan(reloaded.getSnapshot().draft, later).plan, plan);
  assert.ok(validAccountDraft(reloaded.getSnapshot().draft));
  const timestampOnly = saveShadingInput(chosen, { ...chosen.shadingScenario!.input, updatedAt: later });
  assert.equal(materialSignature(timestampOnly), materialSignature(chosen));
  assert.equal(coolingOptions(timestampOnly).selected?.id, "external-shading");
  assert.equal(coolingPlan({ ...timestampOnly, coolingPlanDraft: plan }, later).invalidStoredPlan, false);
  const edited = saveShadingInput(reloaded.getSnapshot().draft, { ...chosen.shadingScenario!.input, proposedShadePercent: "40", assumptionsAccepted: false, updatedAt: later });
  reloaded.save(edited);
  assert.equal(coolingOptions(reloaded.getSnapshot().draft).selected, null);
  assert.deepEqual(reloaded.getSnapshot().draft.history?.[0]?.plan.comparisonSnapshot, plan.comparisonSnapshot);
  assert.equal(isAssessmentDraft(reloaded.getSnapshot().draft), true);
  // Room fields which older selections did not consider must still archive a shading estimate.
  for (const [field, value] of [["position", "upper-floor"], ["internalCoverings", ["curtains"]]] as const) {
    const separate = createAssessmentRepository(persistence);
    separate.save({ ...chosen, coolingPlanDraft: plan });
    const roomChanged = answer(separate.getSnapshot().draft, field, value as AnswerValue, later);
    assert.notEqual(materialSignature(roomChanged), materialSignature(chosen));
    separate.save(roomChanged);
    assert.equal(coolingOptions(separate.getSnapshot().draft).selected, null);
    assert.deepEqual(separate.getSnapshot().draft.history?.[0]?.plan.comparisonSnapshot, plan.comparisonSnapshot);
  }
});

