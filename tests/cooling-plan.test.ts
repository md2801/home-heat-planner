import assert from "node:assert/strict";
import test from "node:test";
import type { AnswerValue } from "../src/domain/models.ts";
import { answerFor, emptyAssessment, isAssessmentDraft, updateAnswer, type AssessmentDraft } from "../src/features/assessment/state.ts";
import { questions } from "../src/features/assessment/questions.ts";
import { selectCoolingOption, type OptionId } from "../src/features/cooling-options/model.ts";
import { canSavePlan, chooseCheckIn, coolingPlan, isPlanForSelection, localDate, planDestination, saveCoolingPlan, togglePlanStep, validCustomDate } from "../src/features/cooling-plan/model.ts";
import { createCoolingPlanService } from "../src/features/cooling-plan/repository.ts";
import { createAssessmentRepository } from "../src/features/assessment/repository.ts";
import { createBrowserPersistence } from "../src/lib/persistence/browser-storage.ts";
const at = "2026-10-03T00:00:00.000Z";
const later = "2026-10-03T00:01:00.000Z";
function fixture(values: Record<string, AnswerValue | null> = {}): AssessmentDraft {
  let draft = emptyAssessment();
  for (const q of questions) if (Object.hasOwn(values, q.id)) draft = updateAnswer(draft, q, answerFor(q, values[q.id]!, at));
  return draft;
}
function selected() { return selectCoolingOption(fixture({ heatTiming: ["afternoon"], windowOrientation: ["west"], externalShading: "none" }), "external-shading", at); }
function repository() {
  const data = new Map<string, string>();
  const persistence = createBrowserPersistence("plan-test", isAssessmentDraft, () => ({ getItem: key => data.get(key) ?? null, setItem: (key, value) => { data.set(key, value); }, removeItem: key => { data.delete(key); } }));
  return { data, persistence, store: createAssessmentRepository(persistence) };
}
test("each actual selected option projects its own investigation and uncompleted checklist", () => {
  const cases: [Record<string, AnswerValue | null>, OptionId, string][] = [
    [{ heatTiming: ["afternoon"], windowOrientation: ["west"], externalShading: "none" }, "external-shading", "External window shading"],
    [{ aboveRoom: "roof", insulation: null }, "ceiling-insulation", "Ceiling insulation review"],
    [{ windowsOpen: "none" }, "opening-review", "Window opening review"],
  ];
  for (const [values, id, label] of cases) {
    const draft = selectCoolingOption(fixture(values), id, at);
    const view = coolingPlan(draft, at);
    assert.equal(view.plan?.selectedActionId, id);
    assert.equal(view.plan?.selectedActionLabel, label);
    assert.equal(view.plan?.status, "planned");
    assert.ok(view.plan?.checklist.every(step => !step.completed));
    assert.equal(view.plan?.checkInDate.status, "unknown");
    assert.equal(view.plan?.comparisonSnapshot.status, "known");
    assert.ok(view.plan?.evidence.length);
    assert.equal(planDestination(view.plan), null);
  }
});
test("missing or stale selection does not manufacture a plan", () => {
  assert.equal(coolingPlan(emptyAssessment(), at).plan, null);
  const q = questions.find(q => q.id === "externalShading")!;
  assert.equal(coolingPlan(updateAnswer(selected(), q, answerFor(q, "all", later)), at).plan, null);
});
test("checklist and check-in persist before saving, explicit save and full reload restore the plan", () => {
  const { store, persistence } = repository(); store.save(selected());
  const service = createCoolingPlanService(store);
  const initial = service.read(at).plan!;
  const edited = chooseCheckIn(togglePlanStep(initial, "window", true, later), "14-days", later);
  assert.equal(service.persist(edited), true);
  assert.equal(planDestination(service.read(at).plan), null);
  const saved = saveCoolingPlan(service.read(at).plan!, later); service.persist(saved);
  const refreshed = createAssessmentRepository(persistence); refreshed.hydrate();
  const restored = createCoolingPlanService(refreshed).read(later);
  assert.deepEqual(restored.plan, saved);
  assert.equal(restored.plan?.checklist[0]?.completed, true);
  assert.equal(restored.plan?.checkInDate.status, "known");
  assert.equal(planDestination(restored.plan), "/follow-up");
  assert.equal(restored.journey.plan.status, "known");
  assert.equal(restored.plan?.createdAt, at);
  assert.equal(restored.plan?.updatedAt, later);
  // Existing Screen 2 edits spread the same envelope, retaining the plan without rewriting Screen 2.
  const budget = questions.find(q => q.id === "budgetAud")!;
  refreshed.save(updateAnswer(refreshed.getSnapshot().draft, budget, answerFor(budget, 500, later)));
  assert.equal(createCoolingPlanService(refreshed).read(later).plan, null);
  refreshed.clear();
  assert.equal(persistence.load().ok, true);
  const cleared = createAssessmentRepository(persistence); cleared.hydrate();
  assert.equal(createCoolingPlanService(cleared).read(later).plan, null);
});
test("7/14 days use calendar dates; custom dates validate and clearing preserves unknown", () => {
  const initial = coolingPlan(selected(), at).plan!;
  for (const [choice, expected] of [["7-days", "2026-10-10"], ["14-days", "2026-10-17"]] as const) {
    const plan = chooseCheckIn(initial, choice, at);
    assert.equal(plan.checkInDate.status, "known");
    if (plan.checkInDate.status === "known") assert.equal(plan.checkInDate.value, expected);
  }
  for (const value of ["", "2026-02-30", "2026-10-02", "tomorrow", "2026-13-01"]) {
    assert.equal(validCustomDate(value, localDate(at)), false);
    assert.throws(() => chooseCheckIn(initial, "custom", at, value));
  }
  assert.equal(validCustomDate("2026-10-03", localDate(at)), true);
  const incomplete = chooseCheckIn(initial, "custom", at);
  assert.equal(canSavePlan(incomplete), false);
  assert.throws(() => saveCoolingPlan(incomplete, at));
  const custom = chooseCheckIn(initial, "custom", at, "2026-11-12");
  assert.equal(canSavePlan(custom), true);
  const cleared = chooseCheckIn(custom, null, at);
  assert.equal(cleared.checkInChoice.status, "unknown");
  assert.equal(cleared.checkInDate.status, "unknown");
  assert.equal(planDestination(saveCoolingPlan(cleared, at)), "/follow-up");
});
test("custom check-in persists and remains a valid saved due date after it passes", () => {
  const { store, persistence } = repository(); store.save(selected());
  const service = createCoolingPlanService(store);
  const plan = saveCoolingPlan(chooseCheckIn(service.read(at).plan!, "custom", at, "2026-10-10"), later);
  service.persist(plan);
  const refreshed = createAssessmentRepository(persistence); refreshed.hydrate();
  assert.deepEqual(createCoolingPlanService(refreshed).read("2026-11-20T00:00:00Z").plan, plan);
});
test("unknown financial values stay unavailable and corrupt financial snapshots cannot become product values", () => {
  const view = coolingPlan(selected(), at), plan = view.plan!;
  assert.equal(plan.financialStatus, "insufficient-evidence");
  assert.equal(plan.upfrontCostAud.status, "unknown");
  assert.ok(plan.comparisonSnapshot.status === "known");
  assert.equal(plan.comparisonSnapshot.value.annualNetSavings.amountAud.status, "unknown");
  assert.equal(plan.comparisonSnapshot.value.simplePaybackYears.status, "unknown");
  assert.equal(isPlanForSelection({ ...plan, upfrontCostAud: { status: "known", value: 500 } }, plan), false);
  assert.equal(isPlanForSelection({ ...plan, comparisonSnapshot: { status: "known", value: "fabricated" } }, plan), false);
  assert.equal(isPlanForSelection({ ...plan, checkInDate: { status: "known", value: "2026-02-30" } }, plan), false);
  const corrupt = { ...selected(), coolingPlanDraft: { schemaVersion: 99 } } as unknown as Parameters<typeof coolingPlan>[0];
  assert.equal(coolingPlan(corrupt, at).invalidStoredPlan, true);
});
test("edits require save again; checkbox progress never claims completed installation", () => {
  const plan = saveCoolingPlan(coolingPlan(selected(), at).plan!, at);
  const edited = togglePlanStep(plan, "window", true, later);
  assert.equal(edited.savedAt.status, "unknown");
  assert.equal(planDestination(edited), null);
  assert.equal(edited.status, "planned");
  assert.throws(() => togglePlanStep(plan, "fabricated", true, later));
});
test("blocked browser saving preserves in-tab plan with an explicit notice", () => {
  const persistence = createBrowserPersistence("blocked-plan", isAssessmentDraft, () => ({ getItem: () => null, setItem: () => { throw new Error("blocked"); }, removeItem: () => {} }));
  const store = createAssessmentRepository(persistence); store.save(selected());
  const service = createCoolingPlanService(store);
  assert.equal(service.persist(saveCoolingPlan(service.read(at).plan!, at)), false);
  assert.ok(store.getSnapshot().notice);
  assert.equal(service.read(at).plan?.savedAt.status, "known");
});
