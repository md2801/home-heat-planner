import { test } from "node:test";
import assert from "node:assert/strict";
import { answerFor, emptyAssessment, updateAnswer, type AssessmentDraft } from "../src/features/assessment/state.ts";
import { questions } from "../src/features/assessment/questions.ts";
import { replacementComparison, type ReplacementInputs } from "../src/features/cooling-options/replacement.ts";
import { roomBaseline } from "../src/features/room-baseline/model.ts";
import { coolingOptions, selectCoolingOption } from "../src/features/cooling-options/model.ts";
import { chooseCheckIn, coolingPlan, saveCoolingPlan } from "../src/features/cooling-plan/model.ts";
import { calendarReminder } from "../src/features/cooling-plan/calendar.ts";
import { createAssessmentRepository } from "../src/features/assessment/repository.ts";
import { isAssessmentDraft } from "../src/features/assessment/state.ts";
import { createBrowserPersistence } from "../src/lib/persistence/browser-storage.ts";
import { executePlanner } from "../src/services/journey-adapters.ts";
import { isPlannerCommand, isPlannerResult } from "../src/contracts/validation.ts";
import { assessmentInput } from "../src/contracts/journey.ts";
const at = "2026-10-03T01:00:00Z";
/** Synthetic arithmetic fixtures, not actual appliance data, prices or product recommendations. */
function fixture(): AssessmentDraft {
  let draft = emptyAssessment();
  for (const [id, value] of Object.entries({ cooling: ["air-conditioner"], servesOnlyRoom: true, externalChangesPermitted: true, budgetAud: 1500 })) { const q = questions.find(q => q.id === id)!; draft = updateAnswer(draft, q, answerFor(q, value, at)); }
  const replacement: ReplacementInputs = { updatedAt: at, fields: { existingModel: "Synthetic existing indoor/outdoor pair", proposedModel: "Synthetic replacement pair", existingSource: "https://example.org/existing-label", proposedSource: "https://example.org/new-label", checkedDate: "2026-10-02", existingCapacity: "2.5", proposedCapacity: "2.5", existingKwh: "1000", proposedKwh: "600", tariff: "0.3", installedCost: "1200", quoteScope: "Synthetic installed quote including removal, installation and electrical work", quoteDate: "2026-10-02", existingRecurring: "0", proposedRecurring: "20" }, confirmations: { labels: true, climate: true, sizing: true, conditions: true } };
  return { ...draft, replacement };
}
test("documented standard-label comparison calculates annual net savings and payback independently", () => {
  const draft = fixture(); const result = replacementComparison(draft.replacement, roomBaseline(draft).profile);
  assert.deepEqual(result.gaps, []); assert.equal(result.comparison.annualNetSavings.status, "supported-estimate");
  assert.equal(result.comparison.baseline.amountAud.status === "known" && result.comparison.baseline.amountAud.value, 300);
  assert.equal(result.comparison.proposed.amountAud.status === "known" && result.comparison.proposed.amountAud.value, 180);
  assert.equal(result.comparison.annualNetSavings.amountAud.status === "known" && result.comparison.annualNetSavings.amountAud.value, 100);
  assert.equal(result.comparison.simplePaybackYears.status === "known" && result.comparison.simplePaybackYears.value, 12);
  assert.match(result.comparison.annualNetSavings.limitations.join(" "), /not personalised/);
  assert.equal(coolingOptions(draft).options[0]?.budgetStatus, "within-budget");
});
test("missing, noncomparable, unpermitted and unsupported values cannot produce intervention savings", () => {
  for (const change of [{ confirmations: { climate: false } }, { fields: { proposedCapacity: "3.5" } }, { fields: { proposedSource: "javascript:alert(1)" } }, { fields: { quoteDate: "2099-01-01" } }, { fields: { tariff: "" } }]) {
    const d = fixture(); d.replacement = { ...d.replacement!, confirmations: { ...d.replacement!.confirmations, ...change.confirmations }, fields: { ...d.replacement!.fields, ...change.fields } };
    const r = replacementComparison(d.replacement, roomBaseline(d).profile); assert.equal(r.comparison.annualNetSavings.amountAud.status, "unknown"); assert.equal(r.comparison.simplePaybackYears.status, "unknown");
  }
  const d = fixture(); const p = roomBaseline(d).profile; p.externalChangesPermitted = { status: "unknown", reason: "No permission evidence" };
  assert.equal(replacementComparison(d.replacement, p).comparison.annualNetSavings.status, "insufficient-evidence");
});
test("increases, zero costs and service-life limitations stay visible", () => {
  const d = fixture(); d.replacement!.fields.proposedKwh = "1200";
  let r = replacementComparison(d.replacement, roomBaseline(d).profile);
  assert.equal(r.comparison.annualNetSavings.amountAud.status === "known" && r.comparison.annualNetSavings.amountAud.value, -80); assert.equal(r.comparison.simplePaybackYears.status, "unknown");
  d.replacement!.fields.proposedKwh = "600"; d.replacement!.fields.installedCost = "0";
  r = replacementComparison(d.replacement, roomBaseline(d).profile); assert.equal(r.upfront.status === "known" && r.upfront.value, 0); assert.equal(r.comparison.simplePaybackYears.status, "unknown");
  d.replacement!.fields.installedCost = "1200"; d.replacement!.fields.serviceLife = "10"; d.replacement!.fields.serviceLifeSource = "Synthetic service-life reference";
  assert.match(replacementComparison(d.replacement, roomBaseline(d).profile).lifeWarning, /exceeds/);
});
test("unrelated edits and repeated values keep selection; material edits archive original financial snapshot", () => {
  const repo = createAssessmentRepository(createBrowserPersistence("history", isAssessmentDraft, () => { const m = new Map<string,string>(); return { getItem: k => m.get(k) ?? null, setItem: (k,v) => { m.set(k,v); }, removeItem: k => { m.delete(k); } }; }));
  let d = selectCoolingOption(fixture(), "ac-replacement", at); const plan = saveCoolingPlan(coolingPlan(d, at).plan!, at); d = { ...d, coolingPlanDraft: plan }; repo.save(d);
  const goal = questions.find(q => q.id === "goal")!; d = updateAnswer(d, goal, answerFor(goal, "Keep evening comfort", at)); repo.save(d); assert.equal(coolingOptions(d).selected?.id, "ac-replacement");
  const budget = questions.find(q => q.id === "budgetAud")!; d = updateAnswer(d, budget, answerFor(budget, 1500, "2026-10-03T02:00:00Z")); repo.save(d); assert.equal(coolingOptions(d).selected?.id, "ac-replacement");
  d = updateAnswer(d, budget, answerFor(budget, 500, at)); repo.save(d); assert.equal(coolingOptions(d).selected, null); assert.equal(repo.getSnapshot().draft.history?.length, 1); const original = repo.getSnapshot().draft.history?.[0]?.plan.upfrontCostAud; assert.equal(original?.status === "known" && original.value, 1200);
});
test("calendar event preserves local date over DST and excludes private model/room details", () => {
  const d = selectCoolingOption(fixture(), "ac-replacement", at); let p = coolingPlan(d, at).plan!; p = saveCoolingPlan(chooseCheckIn(p, "custom", at, "2026-10-05"), at);
  const text = calendarReminder(p, "https://example.org", at).replace(/\r\n /g, ""); assert.match(text, /DTSTART;VALUE=DATE:20261005/); assert.match(text, /DTEND;VALUE=DATE:20261006/); assert.match(text, /https:\/\/example.org\/follow-up/); assert.doesNotMatch(text, /Synthetic|1200|model/i);
  assert.throws(() => calendarReminder(p, "javascript:bad", at)); assert.throws(() => calendarReminder({ ...p, checkInDate: { status: "unknown", reason: "Cleared" } }, "https://example.org", at));
});
test("working typed adapter accepts real input and rejects malformed transport data", () => {
  const command = { schemaVersion: 1 as const, operation: "compare" as const, assessment: assessmentInput(fixture()) }; assert.equal(isPlannerCommand(command), true); const response = executePlanner(command); assert.equal(isPlannerResult(response), true); assert.equal(response.ok && response.data.comparisons[0]?.annualNetSavings.status, "supported-estimate");
  assert.equal(isPlannerCommand({ ...command, operation: "arbitrary" }), false); assert.equal(isPlannerCommand({ ...command, assessment: { schemaVersion: 99 } }), false); assert.equal(isPlannerResult({ ok: true, data: "fabricated" }), false);
});
