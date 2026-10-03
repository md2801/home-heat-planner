import assert from "node:assert/strict";
import test from "node:test";
import type { AnswerValue } from "../src/domain/models.ts";
import { answerFor, emptyAssessment, updateAnswer, type AssessmentDraft } from "../src/features/assessment/state.ts";
import { questions } from "../src/features/assessment/questions.ts";
import { heatwaveReady } from "../src/features/cooling-plan/heatwave-ready.ts";
import { sources, techniques } from "../src/features/knowledge-base/catalogue.ts";
import { selectCoolingOption } from "../src/features/cooling-options/model.ts";
import { chooseCheckIn, coolingPlan, saveCoolingPlan, togglePlanStep } from "../src/features/cooling-plan/model.ts";

const at = "2026-10-04T00:00:00.000Z";
function fixture(values: Record<string, AnswerValue | null> = {}): AssessmentDraft {
  let draft = emptyAssessment();
  for (const question of questions) if (Object.hasOwn(values, question.id)) {
    draft = updateAnswer(draft, question, answerFor(question, values[question.id]!, at));
  }
  return draft;
}
const ids = (draft: AssessmentDraft) => heatwaveReady(draft).groups.flatMap(group => group.actions.map(action => action.technique.id));
const passive = { heatTiming: ["afternoon"], windowCount: 1, window1Orientation: "west", externalShading: "none", internalCoverings: ["curtains"], cooling: ["none"] } satisfies Record<string, AnswerValue>;

test("shading-relevant rooms get bounded preparation, not a new installation instruction", () => {
  const draft = fixture(passive);
  assert.deepEqual(ids(draft), ["close-curtains", "external-shade", "reduce-indoor-heat"]);
  const preparation = heatwaveReady(draft).groups.find(group => group.id === "before")!;
  const shading = preparation.actions.find(action => action.technique.id === "external-shade")!;
  assert.deepEqual(shading.steps, ["Identify windows receiving direct summer sun."]);
  assert.ok(shading.technique.checks.some(check => /permission/.test(check)));
  assert.ok(!ids(fixture({ ...passive, externalChangesPermitted: false })).includes("external-shade"));
  assert.ok(!ids(fixture({ ...passive, externalShading: "all" })).includes("external-shade"));
});

test("ventilation requires known opening ability and an explicit no-limits report", () => {
  for (const limits of [null, "Security concerns", "Traffic noise", "Smoke outside", "No limits except noise", "Usually fine"]) {
    const result = heatwaveReady(fixture({ windowCount: 1, windowsOpen: "all", ventilationConstraints: limits }));
    assert.ok(!result.groups.some(group => group.id === "cooler"));
    assert.ok(result.ventilationNote);
  }
  for (const windowsOpen of [null, "none"]) {
    assert.ok(!ids(fixture({ windowCount: 1, windowsOpen, ventilationConstraints: "No known limits" })).includes("cooler-air"));
  }
  assert.ok(!ids(fixture({ windowCount: 0, windowsOpen: "all", ventilationConstraints: "No known limits" })).includes("cooler-air"));
  const result = heatwaveReady(fixture({ windowCount: 1, windowsOpen: "some", ventilationConstraints: "No known limits" }));
  assert.equal(result.ventilationNote, null);
  const action = result.groups.find(group => group.id === "cooler")!.actions[0]!;
  assert.match(action.technique.summary, /when outside air is cooler/);
  assert.ok(action.technique.checks.some(check => /secure.*smoke.*air quality/.test(check)));
  assert.ok(action.technique.checks.some(check => /Stop if incoming air/.test(check)));
});

test("AC and fan actions require explicit reports; no missing equipment is recommended", () => {
  const acIds = ids(fixture({ cooling: ["air-conditioner"] }));
  assert.ok(acIds.includes("clean-filters"));
  assert.ok(acIds.includes("comfortable-setting"));
  assert.ok(acIds.includes("cool-used-rooms"));
  assert.ok(!acIds.includes("fans"));
  for (const cooling of [null, ["none"], ["fan"]]) {
    const actions = heatwaveReady(fixture({ cooling })).groups.flatMap(group => group.actions);
    assert.ok(!actions.some(action => ["clean-filters", "comfortable-setting", "cool-used-rooms"].includes(action.technique.id)));
    assert.ok(!actions.some(action => /\bAC\b|air conditioner/i.test([action.title, ...action.steps, ...action.technique.checks].join(" "))));
  }
  assert.ok(ids(fixture({ cooling: ["fan"] })).includes("fans"));
});

test("unknown insulation and missing room facts stay unknown with a general reviewed starting point", () => {
  const missing = emptyAssessment();
  const unknown = fixture({ insulation: null, cooling: null, windowsOpen: null, internalCoverings: null });
  for (const draft of [missing, unknown]) {
    assert.deepEqual(ids(draft), ["reduce-indoor-heat"]);
    assert.ok(heatwaveReady(draft).ventilationNote);
    assert.ok(!JSON.stringify(heatwaveReady(draft)).includes("no insulation"));
  }
  assert.equal(unknown.answers.insulation?.status, "unknown");
});

test("guidance reuses catalogue evidence, preserves safety checks and respects section limits", () => {
  const result = heatwaveReady(fixture({ ...passive, cooling: ["air-conditioner", "fan"], windowsOpen: "all", ventilationConstraints: "None" }));
  const allIds: string[] = [];
  for (const group of result.groups) {
    assert.ok(group.actions.length <= (group.id === "cooler" ? 2 : 3));
    for (const action of group.actions) {
      assert.equal(action.technique, techniques.find(item => item.id === action.technique.id));
      assert.ok(action.technique.sourceIds.every(id => sources[id].url.startsWith("https://")));
      assert.ok(action.technique.checks.length > 0);
      allIds.push(action.technique.id);
    }
  }
  assert.equal(new Set(allIds).size, allIds.length);
});

test("deriving hot-day guidance preserves the saved investigation, checklist, date, evidence and follow-up", () => {
  const selected = selectCoolingOption(fixture(passive), "external-shading", at);
  const plan = saveCoolingPlan(chooseCheckIn(togglePlanStep(coolingPlan(selected, at).plan!, "window", true, at), "7-days", at), at);
  const draft = { ...selected, coolingPlanDraft: plan };
  const before = structuredClone(draft);
  heatwaveReady(draft);
  assert.deepEqual(draft, before);
  assert.deepEqual(coolingPlan(draft, at).plan, plan);
  assert.equal(coolingPlan(draft, at).invalidStoredPlan, false);
  assert.equal(plan.selectedActionId, "external-shading");
  assert.equal(plan.financialStatus, "insufficient-evidence");
});
