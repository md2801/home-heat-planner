import assert from "node:assert/strict";
import test from "node:test";
import type { AnswerValue, Fact, FinancialResult } from "../src/domain/models.ts";
import { unknown } from "../src/domain/unknown.ts";
import { answerFor, emptyAssessment, isAssessmentDraft, updateAnswer, finishAssessment, moveAssessment, type AssessmentDraft } from "../src/features/assessment/state.ts";
import { questions, CORE_QUESTION_IDS } from "../src/features/assessment/questions.ts";
import { coolingOptions, selectCoolingOption, coolingOptionsDestination, refineBudget } from "../src/features/cooling-options/model.ts";
import { calculateSimplePayback } from "../src/lib/calculations/financial.ts";
import { createAssessmentRepository } from "../src/features/assessment/repository.ts";
import { createBrowserPersistence } from "../src/lib/persistence/browser-storage.ts";
const at = "2026-10-03T00:00:00Z";
function fixture(values: Record<string, AnswerValue | null>): AssessmentDraft {
  let draft = emptyAssessment();
  for (const q of questions) if (Object.hasOwn(values, q.id)) draft = updateAnswer(draft, q, answerFor(q, values[q.id]!, at));
  return draft;
}
const solar = { heatTiming: ["afternoon"], windowOrientation: ["west"], externalShading: "none" };
test("explicit external restrictions exclude external AC replacement instead of suggesting an impermissible installation", () => {
  const view = coolingOptions(fixture({ cooling: ["air-conditioner"], externalChangesPermitted: false }));
  assert.equal(view.options.some(o => o.id === "ac-replacement"), false);
  assert.ok(view.gaps.some(g => g.includes("AC replacement is excluded")));
});
test("known matching sun exposure and absent shade enable shading investigation, not installation permission", () => {
  const option = coolingOptions(fixture(solar)).options[0]!;
  assert.equal(option.id, "external-shading");
  assert.equal(option.recommendation.eligibility, "eligible");
  assert.equal(option.readiness, "Check permission first");
  assert.ok(option.recommendation.requiredChecks.includes("External-change permission · Not sure"));
  assert.equal(coolingOptions(fixture({ ...solar, externalChangesPermitted: false })).options.length, 0);
});
test("unknown or partial shading/direction/timing does not establish shading suitability", () => {
  for (const values of [{ ...solar, externalShading: null }, { ...solar, externalShading: "some" }, { ...solar, windowOrientation: null }, { ...solar, heatTiming: null }, { ...solar, externalShading: "all" }]) assert.equal(coolingOptions(fixture(values)).options.length, 0);
});
test("confirmed roof plus absent/unknown insulation supports review; another room or dwelling does not", () => {
  for (const insulation of [false, null]) {
    const option = coolingOptions(fixture({ aboveRoom: "roof", insulation })).options[0]!;
    assert.equal(option.id, "ceiling-insulation");
    assert.equal(option.contributor.reasons[1]?.fact.status, insulation === null ? "unknown" : "known");
  }
  for (const aboveRoom of ["another-room", "another-dwelling", null]) assert.equal(coolingOptions(fixture({ position: "upper-floor", aboveRoom, insulation: false })).options.length, 0);
  assert.equal(coolingOptions(fixture({ aboveRoom: "roof", insulation: true })).options.length, 0);
});
test("supplied opening constraints support review with outdoor and safety limitations", () => {
  for (const values of [{ windowsOpen: "none" }, { windowsOpen: "some" }, { windowsOpen: "all", ventilationConstraints: "Traffic noise prevents opening at night" }]) {
    const option = coolingOptions(fixture(values)).options[0]!;
    assert.equal(option.id, "opening-review");
    assert.ok(option.recommendation.comfortTradeOffs[0]?.includes("cooler outdoor air"));
  }
  assert.equal(coolingOptions(fixture({ windowsOpen: "all", ventilationConstraints: "No known limits" })).options.length, 0);
});
test("sparse completed core stays unknown and creates no filler options", () => {
  let draft = emptyAssessment();
  for (const id of CORE_QUESTION_IDS) {
    const q = questions.find(q => q.id === id)!;
    draft = moveAssessment(updateAnswer(draft, q, answerFor(q, null, at)), "continue");
  }
  draft = finishAssessment(draft);
  const view = coolingOptions(draft);
  assert.equal(draft.completed, true);
  assert.equal(view.options.length, 0);
  assert.equal(view.baseline.profile.budgetAud.status, "unknown");
  assert.equal(view.baseline.kind, "unavailable");
  assert.equal(coolingOptionsDestination(draft), null);
});
test("valid 54 AUD baseline never establishes intervention savings, cost, affordability or payback", () => {
  const draft = fixture({ ...solar, aboveRoom: "roof", insulation: null, windowsOpen: "none", cooling: ["air-conditioner"], energyBasis: "scenario", averageElectricalInputKw: 1, hoursPerDay: 6, coolingDays: 30, periodDescription: "My summer scenario", flatTariffAudPerKwh: .3, budgetAud: 2000 });
  const view = coolingOptions(draft);
  assert.equal(view.baseline.result?.amountAud.status, "known");
  if (view.baseline.result?.amountAud.status === "known") assert.equal(view.baseline.result.amountAud.value, 54);
  assert.equal(view.options.length, 3);
  for (const option of view.options) {
    assert.equal(option.status, "insufficient-evidence");
    assert.equal(option.comparison.annualNetSavings.amountAud.status, "unknown");
    assert.equal(option.comparison.simplePaybackYears.status, "unknown");
    assert.equal(option.recommendation.upfrontCostAud.status, "unknown");
    assert.equal(option.budgetStatus, "cost-not-established");
    assert.deepEqual(option.comparison.assumptions, []);
  }
  assert.equal(coolingOptions(fixture({ ...solar, budgetAud: 0 })).options[0]?.budgetStatus, "cost-not-established");
});
test("synthetic generic payback inputs require positive supported annual savings and known cost", () => {
  const known = (value: number): Fact<number> => ({ status: "known", value, provenance: { kind: "assumed", recordedAt: at, sourceIds: [], scope: "Synthetic calculation test only" } });
  const result: FinancialResult = { status: "supported-estimate", amountAud: known(60), currency: "AUD", period: { status: "known", value: { kind: "cooling-schedule", coolingDays: 30, basis: "annual", description: "Synthetic annual fixture" }, provenance: { kind: "assumed", recordedAt: at, sourceIds: [], scope: "Synthetic period" } }, methodVersion: "test-only", inputProvenance: [], assumptions: [], sourceIds: [], limitations: [] };
  assert.deepEqual(calculateSimplePayback(known(300), result).status, "calculated");
  const positive = calculateSimplePayback(known(300), result);
  if (positive.status === "calculated") assert.equal(positive.years, 5);
  for (const amountAud of [unknown(), known(0), known(-20)]) assert.equal(calculateSimplePayback(known(300), { ...result, amountAud }).status, "unavailable");
  assert.equal(calculateSimplePayback(unknown(), result).status, "unavailable");
});
test("selection persists through refresh, budget editing preserves answers, changes require reselection and clear deletes selection", () => {
  const data = new Map<string, string>();
  const persistence = createBrowserPersistence("options-test", isAssessmentDraft, () => ({ getItem: key => data.get(key) ?? null, setItem: (key, value) => { data.set(key, value); }, removeItem: key => { data.delete(key); } }));
  const repository = createAssessmentRepository(persistence);
  const selected = selectCoolingOption(fixture(solar), "external-shading", at);
  repository.save(selected);
  const refreshed = createAssessmentRepository(persistence);
  refreshed.hydrate();
  const draft = refreshed.getSnapshot().draft;
  assert.equal(coolingOptions(draft).selected?.id, "external-shading");
  assert.equal(coolingOptions(draft).journey.selectedActionId.status, "known");
  assert.equal(coolingOptionsDestination(draft), "/cooling-plan");
  assert.deepEqual(refineBudget(draft).answers, draft.answers);
  assert.equal(refineBudget(draft).currentQuestionId, "budgetAud");
  const shade = questions.find(q => q.id === "externalShading")!;
  assert.equal(coolingOptionsDestination(updateAnswer(draft, shade, answerFor(shade, "all", at))), null);
  assert.throws(() => selectCoolingOption(emptyAssessment(), "external-shading", at));
  assert.equal(isAssessmentDraft({ ...draft, selectedOption: { actionId: "fictional", recordedAt: at, assessmentSignature: "x" } }), false);
  refreshed.clear();
  const cleared = createAssessmentRepository(persistence); cleared.hydrate();
  assert.equal(cleared.getSnapshot().draft.selectedOption, undefined);
});
