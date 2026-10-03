import assert from "node:assert/strict";
import test from "node:test";
import type { AnswerValue } from "../src/domain/models.ts";
import { calculateCoolingCost } from "../src/lib/calculations/financial.ts";
import { createBrowserPersistence, type StoragePort } from "../src/lib/persistence/browser-storage.ts";
import { createAssessmentRepository } from "../src/features/assessment/repository.ts";
import { activeQuestions, CORE_QUESTION_IDS, questions } from "../src/features/assessment/questions.ts";
import { answerFor, emptyAssessment, finishAssessment, isAssessmentDraft, moveAssessment, updateAnswer, type AssessmentDraft } from "../src/features/assessment/state.ts";
import { canConfirmMeasuredScope, confirmMeasuredScope, confirmRoomReview, factText, formatMoney, measuredScopeConfirmed, revokeMeasuredScope, roomBaseline } from "../src/features/room-baseline/model.ts";
const at = "2026-10-02T00:00:00.000Z";
function change(draft: AssessmentDraft, id: string, value: AnswerValue | null): AssessmentDraft {
  const q = questions.find(q => q.id === id)!;
  return updateAnswer(draft, q, answerFor(q, value, at));
}
function fixture(values: Record<string, AnswerValue | null>): AssessmentDraft {
  let draft = emptyAssessment();
  for (const q of questions) if (Object.hasOwn(values, q.id)) draft = change(draft, q.id, values[q.id]!);
  return draft;
}
function scenario(overrides: Record<string, AnswerValue | null> = {}): AssessmentDraft {
  return fixture({ cooling: ["air-conditioner"], energyBasis: "scenario", averageElectricalInputKw: 1, hoursPerDay: 6, coolingDays: 30, flatTariffAudPerKwh: .30, ...overrides });
}
function measured(overrides: Record<string, AnswerValue | null> = {}): AssessmentDraft {
  return fixture({ cooling: ["air-conditioner"], servesOnlyRoom: true, energyBasis: "measured", coolingKwh: 100, energyScope: "Dedicated meter for this bedroom’s air conditioner", periodStart: "2026-01-01", periodEnd: "2026-01-31", flatTariffAudPerKwh: .30, ...overrides });
}
function amount(draft: AssessmentDraft): number {
  const result = roomBaseline(draft).result;
  if (!result || result.amountAud.status !== "known" || typeof result.amountAud.value !== "number") throw new Error("No cost available");
  return result.amountAud.value;
}
test("typed complaint and supplied model remain user reports without extracting hidden room facts", () => {
  const draft = fixture({ complaint: "Synthetic bedroom becomes uncomfortable after lunch", cooling: ["air-conditioner"] });
  draft.replacement = { fields: { existingModel: "Synthetic indoor/outdoor model pair" }, confirmations: {}, updatedAt: at };
  const profile = roomBaseline(draft).profile;
  assert.equal(profile.complaint.status === "known" && profile.complaint.value, "Synthetic bedroom becomes uncomfortable after lunch");
  assert.equal(profile.cooling.status === "known" && profile.cooling.value.modelIdentifier.status === "known" && profile.cooling.value.modelIdentifier.value, "Synthetic indoor/outdoor model pair");
  assert.equal(profile.heatTiming.status, "unknown");
  assert.equal(profile.insulation.status, "unknown");
});
test("actual supplied scenario inputs calculate 54 AUD without inventing bedroom attribution or a month", () => {
  const draft = scenario();
  assert.equal(amount(draft), 54);
  const view = roomBaseline(draft);
  assert.equal(view.result?.status, "what-if");
  assert.equal(view.inputs?.bedroomAttribution.status, "unknown");
  assert.match(view.periodLabel, /30 cooling days/);
  assert.doesNotMatch(view.periodLabel, /month|annual/i);
  assert.equal(view.arithmetic, "1 kW × 6 h/day × 30 days × 0.3 AUD/kWh = $54");
  assert.equal(view.result?.amountAud.status === "known" && view.result.amountAud.provenance.kind, "assumed");
  assert.equal(formatMoney(54), "$54");
});
test("different scenarios and changes recalculate deterministically", () => {
  const first = scenario({ averageElectricalInputKw: .75, hoursPerDay: 4, coolingDays: 20, flatTariffAudPerKwh: .28, periodDescription: "My stated summer scenario" });
  assert.ok(Math.abs(amount(first) - 16.8) < 1e-10);
  assert.equal(amount(scenario({ hoursPerDay: 4 })), 36);
  assert.equal(amount(scenario({ hoursPerDay: 8 })), 72);
  assert.match(roomBaseline(first).periodLabel, /My stated summer scenario/);
  assert.equal(roomBaseline(first).inputRows.find(row => row.label === "Average electrical input")?.provenance, "Your scenario assumption");
});
test("missing tariff or electrical input yields insufficient information and no invented cost", () => {
  for (const [field, pattern] of [["flatTariffAudPerKwh", /tariff/], ["averageElectricalInputKw", /electrical input/]] as const) {
    const view = roomBaseline(scenario({ [field]: null }));
    assert.equal(view.result?.status, "insufficient-evidence");
    assert.equal(view.result?.amountAud.status, "unknown");
    assert.ok(view.missing.some(item => pattern.test(item)));
    assert.equal(view.arithmetic, null);
  }
});

test("skipped cooling costs keep the room profile available without a measured or scenario result", () => {
  const draft = fixture({ heatTiming: ["afternoon"], aboveRoom: "roof", cooling: ["air-conditioner"], servesOnlyRoom: false, energyBasis: null });
  const view = roomBaseline(confirmRoomReview(draft, at));
  assert.equal(view.kind, "unavailable");
  assert.equal(view.result, null);
  assert.equal(view.inputs, null);
  assert.equal(view.scopeConfirmationAvailable, false);
  assert.equal(view.profile.cooling.status === "known" && view.profile.cooling.value.servesOnlyRoom.status === "known" && view.profile.cooling.value.servesOnlyRoom.value, false);
  assert.equal(view.profile.aboveRoom.status === "known" && view.profile.aboveRoom.value, "roof");
  assert.equal(view.journey.confirmedProfile.status, "known");
  assert.equal(view.journey.currentCoolingCost.status, "unknown");
});
test("zero hours, cooling days, power and tariff are real supplied values", () => {
  for (const field of ["hoursPerDay", "coolingDays", "averageElectricalInputKw", "flatTariffAudPerKwh"]) {
    const draft = scenario({ [field]: 0 });
    assert.equal(amount(draft), 0);
    assert.equal(roomBaseline(draft).result?.status, "what-if");
  }
  assert.equal(amount(confirmMeasuredScope(measured({ coolingKwh: 0 }), at)), 0);
});
test("measured costs require explicit bedroom-only measurement confirmation, not just an equipment answer", () => {
  const draft = measured();
  assert.equal(roomBaseline(draft).result?.amountAud.status, "unknown");
  assert.equal(canConfirmMeasuredScope(draft), true);
  const confirmed = confirmMeasuredScope(draft, at);
  const view = roomBaseline(confirmed);
  assert.equal(amount(confirmed), 30);
  assert.equal(view.result?.status, "supported-estimate");
  assert.equal(view.result?.amountAud.status === "known" && view.result.amountAud.provenance.kind, "user-reported");
  assert.equal(view.periodLabel, "2026-01-01 to 2026-01-31");
  assert.equal(view.arithmetic, "100 kWh × 0.3 AUD/kWh = $30");
  assert.equal(view.inputs?.bedroomAttribution.status, "known");
  assert.equal(view.result?.sourceIds.length, 0);
  assert.equal(roomBaseline(revokeMeasuredScope(confirmed)).result?.amountAud.status, "unknown");
});
test("shared or unknown systems and unknown measurement descriptions cannot become bedroom measurements", () => {
  for (const overrides of [{ servesOnlyRoom: false }, { servesOnlyRoom: null }, { energyScope: null }]) {
    const draft = measured(overrides);
    assert.equal(canConfirmMeasuredScope(draft), false);
    assert.equal(confirmMeasuredScope(draft, at), draft);
    assert.equal(roomBaseline(draft).result?.amountAud.status, "unknown");
  }
  const view = roomBaseline(measured());
  assert.ok(view.inputs);
  assert.equal(calculateCoolingCost(view.inputs, "supplied-scenario").amountAud.status, "unknown");
});
test("edited measurement invalidates attribution while an edited tariff recalculates the same confirmed scope", () => {
  const confirmed = confirmMeasuredScope(measured(), at);
  const changedEnergy = change(confirmed, "coolingKwh", 120);
  assert.equal(measuredScopeConfirmed(changedEnergy), false);
  assert.equal(roomBaseline(changedEnergy).result?.amountAud.status, "unknown");
  const changedTariff = change(confirmed, "flatTariffAudPerKwh", .40);
  assert.equal(measuredScopeConfirmed(changedTariff), true);
  assert.equal(amount(changedTariff), 40);
});
test("unknown room facts remain unknown; reported directions do not create individual windows or top-floor claims", () => {
  const draft = fixture({ heatTiming: ["afternoon"], position: "upper-floor", windowOrientation: ["west"], insulation: null, budgetAud: 500 });
  const profile = roomBaseline(draft).profile;
  assert.equal(factText(profile.insulation), "Not sure");
  assert.equal(profile.aboveRoom.status, "unknown");
  assert.equal(profile.windows.status, "unknown");
  assert.equal(profile.windowSummary?.orientations.status === "known" && profile.windowSummary.orientations.value[0], "west");
  assert.equal(profile.position.status === "known" && profile.position.value, "upper-floor");
  assert.equal(profile.budgetAud.status === "known" && profile.budgetAud.value, 500);
  assert.equal(profile.confirmedAt.status, "unknown");
  const reviewed = roomBaseline(confirmRoomReview(draft, at));
  assert.equal(reviewed.journey.confirmedProfile.status, "known");
  assert.equal(reviewed.profile.insulation.status, "unknown");
  assert.equal(reviewed.profile.windows.status, "unknown");
});
test("core-only early exit and direct empty access have usable unknown baseline states", () => {
  let draft = emptyAssessment();
  for (const id of CORE_QUESTION_IDS) {
    draft = change(draft, id, null);
    draft = moveAssessment(draft, "continue");
  }
  draft = finishAssessment(draft);
  assert.equal(isAssessmentDraft(draft), true);
  const view = roomBaseline(draft);
  assert.equal(view.result, null);
  assert.ok(view.missing.length > 0);
  assert.equal(view.profile.insulation.status, "unknown");
  assert.equal(view.journey.currentCoolingCost.status, "unknown");
  assert.equal(roomBaseline(emptyAssessment()).result, null);
  const none = roomBaseline(fixture({ cooling: ["none"] }));
  assert.equal(none.noEquipment, true);
  assert.equal(none.result, null);
  assert.deepEqual(none.missing, []);
  assert.equal(activeQuestions(draft.answers).some(q => q.id === "averageElectricalInputKw"), false);
});
test("persisted assessment and Screen 3 confirmations survive refresh; clear deletes both", () => {
  const data = new Map<string, string>();
  const storage: StoragePort = { getItem: key => data.get(key) ?? null, setItem: (key, value) => { data.set(key, value); }, removeItem: key => { data.delete(key); } };
  const persistence = createBrowserPersistence("baseline-test", isAssessmentDraft, () => storage);
  const repository = createAssessmentRepository(persistence);
  const draft = confirmRoomReview(confirmMeasuredScope(measured(), at), at);
  assert.equal(isAssessmentDraft(draft), true);
  repository.save(draft);
  const refreshed = createAssessmentRepository(persistence);
  refreshed.hydrate();
  const view = roomBaseline(refreshed.getSnapshot().draft);
  assert.equal(view.scopeConfirmed, true);
  assert.equal(amount(refreshed.getSnapshot().draft), 30);
  assert.equal(view.journey.confirmedProfile.status, "known");
  assert.equal(isAssessmentDraft({ ...draft, review: { measuredScope: { signature: "x", recordedAt: "invalid" } } }), false);
  refreshed.clear();
  assert.equal(persistence.load().ok && data.size, 0);
  assert.equal(roomBaseline(refreshed.getSnapshot().draft).result, null);
});
