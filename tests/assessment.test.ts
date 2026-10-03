import test from "node:test";
import assert from "node:assert/strict";
import { activeQuestions, CORE_QUESTION_IDS, questions, type Question } from "../src/features/assessment/questions.ts";
import { answerFor, assessmentDestination, assessmentJourney, canContinue, canSeeAssessment, coreAssessmentComplete, emptyAssessment, finishAssessment, isAssessmentDraft, moveAssessment, updateAnswer, validValue, type AssessmentDraft } from "../src/features/assessment/state.ts";
import { createAssessmentRepository } from "../src/features/assessment/repository.ts";
import { createBrowserPersistence, type StoragePort } from "../src/lib/persistence/browser-storage.ts";
import type { AnswerValue } from "../src/domain/models.ts";
const recordedAt = "2026-10-02T00:00:00.000Z";
const question = (id: string): Question => questions.find(q => q.id === id)!;
function answer(draft: AssessmentDraft, id: string, value: AnswerValue | null): AssessmentDraft {
  return updateAnswer(draft, question(id), answerFor(question(id), value, recordedAt));
}
function storage(): StoragePort {
  const data = new Map<string, string>();
  return { getItem: key => data.get(key) ?? null, setItem: (key, value) => { data.set(key, value); }, removeItem: key => { data.delete(key); } };
}
test("Continue requires an explicit valid answer; Back restores answers and unknown remains unknown", () => {
  let draft = emptyAssessment();
  assert.equal(moveAssessment(draft, "continue"), draft);
  draft = answer(draft, "heatTiming", ["afternoon", "overnight"]);
  draft = moveAssessment(draft, "continue");
  assert.equal(draft.currentQuestionId, "position");
  draft = answer(draft, "position", null);
  draft = moveAssessment(draft, "continue");
  draft = moveAssessment(draft, "back");
  assert.equal(draft.answers.position?.status, "unknown");
  draft = moveAssessment(draft, "back");
  assert.deepEqual(draft.answers.heatTiming, answerFor(question("heatTiming"), ["afternoon", "overnight"], recordedAt));
  assert.equal(draft.answers.windowOrientation, undefined);
});
test("switching cooling branches removes incompatible values without inventing defaults", () => {
  let draft = answer(emptyAssessment(), "cooling", ["air-conditioner"]);
  draft = answer(draft, "energyBasis", "scenario");
  draft = answer(draft, "averageElectricalInputKw", 0);
  assert.equal(draft.answers.averageElectricalInputKw?.status, "known");
  assert.equal(draft.answers.averageElectricalInputKw?.status === "known" && draft.answers.averageElectricalInputKw.provenance.kind, "assumed");
  draft = answer(draft, "energyBasis", "measured");
  assert.equal(draft.answers.averageElectricalInputKw, undefined);
  assert.equal(draft.answers.coolingKwh, undefined);
  draft = answer(draft, "coolingKwh", 0);
  draft = answer(draft, "cooling", ["none"]);
  assert.equal(draft.answers.coolingKwh, undefined);
  assert.equal(draft.answers.energyBasis, undefined);
  assert.equal(activeQuestions(draft.answers).some(q => q.id === "flatTariffAudPerKwh"), false);
  assert.equal(assessmentJourney(draft).currentCoolingCost.status, "unknown");
});

test("skipping cooling costs clears either energy branch, preserves room answers and survives reload", () => {
  for (const basis of ["measured", "scenario"] as const) {
    let draft = emptyAssessment();
    while (CORE_QUESTION_IDS.some(id => id === draft.currentQuestionId)) {
      draft = answer(draft, draft.currentQuestionId, draft.currentQuestionId === "cooling" ? ["fan"] : null);
      draft = moveAssessment(draft, "continue");
    }
    draft = answer(draft, "energyBasis", basis);
    const values = basis === "measured"
      ? { coolingKwh: 20, energyScope: "Synthetic dedicated cooling meter", periodStart: "2026-10-01", periodEnd: "2026-10-02" }
      : { averageElectricalInputKw: 0.06, hoursPerDay: 6, coolingDays: 10, periodDescription: "Synthetic ten-day period" };
    for (const [id, value] of Object.entries(values)) draft = answer(draft, id, value);
    draft = answer(draft, "flatTariffAudPerKwh", 0.3);
    draft = { ...draft, currentQuestionId: "energyBasis" };
    const roomAnswers = draft.answers.cooling;
    draft = answer(draft, "energyBasis", null);
    const activeIds = activeQuestions(draft.answers).map(q => q.id);
    for (const id of ["coolingKwh", "energyScope", "periodStart", "periodEnd", "averageElectricalInputKw", "hoursPerDay", "coolingDays", "periodDescription", "flatTariffAudPerKwh"]) {
      assert.equal(activeIds.includes(id), false);
      assert.equal(draft.answers[id], undefined);
    }
    assert.deepEqual(draft.answers.cooling, roomAnswers);
    assert.equal(assessmentJourney(draft).baselineInputs.status, "unknown");
    assert.equal(assessmentJourney(draft).currentCoolingCost.status, "unknown");
    draft = moveAssessment(draft, "continue");
    assert.equal(draft.currentQuestionId, "budgetAud");
    assert.equal(canSeeAssessment(draft), true);
    draft = finishAssessment(draft);
    assert.equal(assessmentDestination(draft), "/room-baseline");
    const savedAnswers = storage();
    const persistence = createBrowserPersistence("skip-test", isAssessmentDraft, () => savedAnswers);
    const repo = createAssessmentRepository(persistence);
    repo.hydrate();
    repo.save(draft);
    const reloaded = createAssessmentRepository(persistence);
    reloaded.hydrate();
    assert.equal(reloaded.getSnapshot().draft.answers.energyBasis?.status, "unknown");
    assert.equal(reloaded.getJourney().baselineInputs.status, "unknown");
    assert.equal(reloaded.getSnapshot().draft.completed, true);
  }
});
test("number, date and choice validation distinguish zero from missing and reject invalid values", () => {
  assert.equal(validValue(question("hoursPerDay"), 0), true);
  for (const value of [-1, 25, Infinity, NaN, "6", null]) assert.equal(validValue(question("hoursPerDay"), value), false);
  assert.equal(validValue(question("coolingDays"), 1.5), false);
  assert.equal(validValue(question("periodStart"), "2026-02-30"), false);
  assert.equal(validValue(question("heatTiming"), []), false);
  assert.equal(validValue(question("cooling"), ["none", "fan"]), false);
  assert.equal(validValue(question("heatTiming"), ["afternoon", "afternoon"]), false);
  let draft = answer(emptyAssessment(), "cooling", ["fan"]);
  draft = answer(draft, "energyBasis", "measured");
  draft = answer(draft, "periodStart", "2026-10-02");
  draft = answer(draft, "periodEnd", "2026-10-01");
  assert.equal(canContinue(question("periodEnd"), draft.answers), false);
  assert.equal(isAssessmentDraft(draft), true);
  draft = answer(draft, "periodEnd", "2026-10-03");
  assert.equal(canContinue(question("periodEnd"), draft.answers), true);
  draft = answer(draft, "periodStart", "2026-10-04");
  assert.equal(draft.answers.periodEnd, undefined);
});
test("unknown path can complete; final state exposes inputs without confirming facts or calculating a cost", () => {
  let draft = emptyAssessment();
  while (!draft.completed) {
    const q = question(draft.currentQuestionId);
    draft = answer(draft, q.id, null);
    draft = moveAssessment(draft, "continue");
  }
  assert.equal(isAssessmentDraft(draft), true);
  const journey = assessmentJourney(draft);
  assert.equal(journey.confirmedProfile.status, "unknown");
  assert.equal(journey.baselineInputs.status, "unknown");
  assert.equal(journey.currentCoolingCost.status, "unknown");
  assert.equal(journey.unknownFields.includes("insulation"), true);
  assert.equal(moveAssessment(draft, "back").completed, false);
});
test("scenario projection preserves unknown power and known zero hours without annualising", () => {
  let draft = answer(emptyAssessment(), "cooling", ["fan"]);
  draft = answer(draft, "energyBasis", "scenario");
  draft = answer(draft, "averageElectricalInputKw", null);
  draft = answer(draft, "hoursPerDay", 0);
  draft = answer(draft, "coolingDays", 30);
  draft = answer(draft, "periodDescription", "October 2026");
  const journey = assessmentJourney(draft);
  assert.equal(journey.baselineInputs.status, "known");
  if (journey.baselineInputs.status !== "known") throw new Error("Missing inputs");
  const baseline = journey.baselineInputs.value;
  assert.equal(baseline.energy.kind, "electrical-input-scenario");
  if (baseline.energy.kind === "electrical-input-scenario") {
    assert.equal(baseline.energy.averageElectricalInputKw.status, "unknown");
    assert.equal(baseline.energy.hoursPerDay.status === "known" && baseline.energy.hoursPerDay.value, 0);
  }
  assert.equal(baseline.flatTariffAudPerKwh.status, "unknown");
  assert.equal(baseline.bedroomAttribution.status, "unknown");
  assert.deepEqual(baseline.period.status === "known" && baseline.period.value, { kind: "cooling-schedule", coolingDays: 30, basis: "stated-period", description: "October 2026" });
});
test("reload preserves draft, position and provenance; corrupt data and unsupported versions are rejected", () => {
  const port = storage();
  const persistence = createBrowserPersistence("test", isAssessmentDraft, () => port);
  const first = createAssessmentRepository(persistence);
  first.hydrate();
  let draft = answer(emptyAssessment(), "heatTiming", ["afternoon"]);
  draft = moveAssessment(draft, "continue");
  draft = answer(draft, "position", null);
  first.save(draft);
  const reloaded = createAssessmentRepository(persistence);
  reloaded.hydrate();
  assert.deepEqual(reloaded.getSnapshot().draft, draft);
  assert.equal(reloaded.getSnapshot().draft.currentQuestionId, "position");
  assert.equal(isAssessmentDraft({ ...draft, schemaVersion: 2 }), false);
  assert.equal(isAssessmentDraft({ ...draft, answers: { location: { status: "known", value: "Parramatta" } } }), false);
  assert.equal(isAssessmentDraft({ ...draft, completed: true }), false);
  port.setItem("test", "{broken");
  const corrupt = createAssessmentRepository(persistence);
  corrupt.hydrate();
  assert.deepEqual(corrupt.getSnapshot().draft, emptyAssessment());
  assert.match(corrupt.getSnapshot().notice!, /could not be read/);
  reloaded.clear();
  assert.equal(port.getItem("test"), null);
});
test("unavailable browser storage keeps answers in memory and reports refresh risk", () => {
  const repository = createAssessmentRepository(createBrowserPersistence("test", isAssessmentDraft, () => null));
  repository.hydrate();
  const draft = answer(emptyAssessment(), "location", null);
  repository.save(draft);
  assert.deepEqual(repository.getSnapshot().draft, draft);
  assert.match(repository.getSnapshot().notice!, /Refreshing may lose/);
  assert.equal(repository.getJourney().assessmentAnswers.location?.status, "unknown");
});
test("measured projection retains the entered date range and user-reported provenance", () => {
  let draft = answer(emptyAssessment(), "cooling", ["air-conditioner"]);
  draft = answer(draft, "energyBasis", "measured");
  draft = answer(draft, "coolingKwh", 0);
  draft = answer(draft, "periodStart", "2026-10-02");
  draft = answer(draft, "periodEnd", "2026-10-03");
  draft = answer(draft, "flatTariffAudPerKwh", 0);
  const journey = assessmentJourney(draft);
  if (journey.baselineInputs.status !== "known") throw new Error("Missing inputs");
  assert.deepEqual(journey.baselineInputs.value.energy, { kind: "measured", coolingKwh: answerFor(question("coolingKwh"), 0, recordedAt) });
  assert.deepEqual(journey.baselineInputs.value.period.status === "known" && journey.baselineInputs.value.period.value, { kind: "date-range", start: "2026-10-02", end: "2026-10-03" });
  assert.equal(journey.baselineInputs.value.bedroomAttribution.status, "unknown");
  assert.equal(journey.currentCoolingCost.status, "unknown");
});
function completeCore(equipment: AnswerValue | null = ["fan"]): AssessmentDraft {
  let draft = emptyAssessment();
  while (!canSeeAssessment(draft)) {
    const id = draft.currentQuestionId;
    draft = answer(draft, id, id === "cooling" ? equipment : null);
    draft = moveAssessment(draft, "continue");
  }
  return draft;
}
test("active core interactions lead the retained full question set; early exit is hidden on core screens", () => {
  assert.deepEqual(activeQuestions({}).slice(0, 11).map(q => q.id), ["heatTiming", "position", "aboveRoom", "windowCount", "windowOrientation", "externalShading", "insulation", "internalCoverings", "windowsOpen", "ventilationConstraints", "cooling"]);
  assert.equal(questions.length, 39);
  assert.equal(new Set(questions.map(q => q.id)).size, 39);
  let draft = emptyAssessment();
  for (const { id } of activeQuestions(draft.answers).filter(q => CORE_QUESTION_IDS.some(id => id === q.id))) {
    assert.equal(canSeeAssessment(draft), false);
    assert.equal(finishAssessment(draft), draft);
    assert.equal(assessmentDestination(draft), null);
    draft = answer(draft, id, null);
    assert.equal(canSeeAssessment(draft), false);
    draft = moveAssessment(draft, "continue");
  }
  assert.equal(coreAssessmentComplete(draft.answers), true);
  assert.equal(draft.currentQuestionId, "location");
  assert.equal(canSeeAssessment(draft), true);
  assert.equal(canContinue(question("location"), draft.answers), false);
  assert.equal(isAssessmentDraft(finishAssessment(draft)), true);
});
test("Continue keeps the optional questions available and early exit stays available on every branch", () => {
  for (const equipment of [["fan"], ["none"], null] as const) {
    for (const basis of ["measured", "scenario"] as const) {
      let draft = completeCore(equipment ? [...equipment] : null);
      let count = 7;
      while (!draft.completed) {
        assert.equal(canSeeAssessment(draft), true, draft.currentQuestionId);
        const q = question(draft.currentQuestionId);
        draft = answer(draft, q.id, q.id === "energyBasis" ? basis : null);
        draft = moveAssessment(draft, "continue");
        count++;
      }
      assert.ok(count > 7);
      assert.equal(assessmentDestination(draft), "/room-baseline");
      assert.equal(isAssessmentDraft(draft), true);
      assert.equal(draft.answers.coolingKwh !== undefined, equipment?.[0] === "fan" && basis === "measured");
      assert.equal(draft.answers.averageElectricalInputKw !== undefined, equipment?.[0] === "fan" && basis === "scenario");
    }
  }
});
test("early exit from different optional questions preserves supplied facts and leaves unanswered values absent/unknown", () => {
  for (const target of ["coolingUsage", "location", "energyBasis", "hoursPerDay", "periodEnd", "willingToObtainQuotes"]) {
    let draft = completeCore();
    while (draft.currentQuestionId !== target) {
      const q = question(draft.currentQuestionId);
      const value = q.id === "energyBasis" ? target === "periodEnd" ? "measured" : "scenario" : q.id === "averageElectricalInputKw" ? 0.5 : null;
      draft = moveAssessment(answer(draft, q.id, value), "continue");
      assert.equal(draft.completed, false);
    }
    const finished = finishAssessment(draft);
    assert.equal(finished.completed, true);
    assert.equal(finished.answers, draft.answers);
    assert.equal(finished.answers[target], undefined);
    assert.equal(isAssessmentDraft(finished), true);
    assert.equal(assessmentDestination(finished), "/room-baseline");
    const journey = assessmentJourney(finished);
    assert.ok(journey.unknownFields.includes(target));
    assert.equal(journey.confirmedProfile.status, "unknown");
    assert.equal(journey.currentCoolingCost.status, "unknown");
    if (target === "hoursPerDay") {
      const power = journey.assessmentAnswers.averageElectricalInputKw;
      assert.equal(power?.status === "known" && power.provenance.kind, "assumed");
      if (journey.baselineInputs.status !== "known" || journey.baselineInputs.value.energy.kind !== "electrical-input-scenario") throw new Error("Missing scenario inputs");
      assert.equal(journey.baselineInputs.value.energy.hoursPerDay.status, "unknown");
      assert.equal(journey.baselineInputs.value.flatTariffAudPerKwh.status, "unknown");
    }
  }
});
test("early completion persists without filling missing answers and Back/Continue restore prior selections", () => {
  const port = storage();
  const persistence = createBrowserPersistence("early-exit", isAssessmentDraft, () => port);
  const repository = createAssessmentRepository(persistence);
  let draft = completeCore(["air-conditioner"]);
  draft = answer(draft, "coolingUsage", "Evening use");
  draft = moveAssessment(draft, "continue");
  repository.save(finishAssessment(draft));
  const restored = createAssessmentRepository(persistence);
  restored.hydrate();
  const saved = restored.getSnapshot().draft;
  assert.deepEqual(saved, { ...draft, completed: true });
  assert.equal(saved.answers.location, undefined);
  assert.equal(canSeeAssessment(saved), true);
  const back = moveAssessment(saved, "back");
  assert.equal(back.currentQuestionId, "coolingUsage");
  assert.deepEqual(back.answers.coolingUsage, draft.answers.coolingUsage);
  assert.equal(back.completed, false);
  const forward = moveAssessment(back, "continue");
  assert.equal(forward.currentQuestionId, "location");
  assert.deepEqual(forward.answers, saved.answers);
  const typeBack = moveAssessment(back, "back");
  assert.equal(typeBack.currentQuestionId, "acType");
  const coreBack = moveAssessment(typeBack, "back");
  assert.equal(coreBack.currentQuestionId, "cooling");
  assert.equal(canSeeAssessment(coreBack), false);
  const noEquipment = answer(coreBack, "cooling", ["none"]);
  assert.equal(noEquipment.answers.coolingUsage, undefined);
  assert.equal(moveAssessment(noEquipment, "continue").currentQuestionId, "location");
});
test("legacy drafts resume missing core questions without discarding existing optional answers", () => {
  const port = storage();
  const persistence = createBrowserPersistence("legacy", isAssessmentDraft, () => port);
  const legacy = { ...answer(emptyAssessment(), "location", "Parramatta"), currentQuestionId: "location" };
  assert.equal(persistence.save(legacy).ok, true);
  const repository = createAssessmentRepository(persistence);
  repository.hydrate();
  const restored = repository.getSnapshot().draft;
  assert.equal(restored.currentQuestionId, "heatTiming");
  assert.deepEqual(restored.answers, legacy.answers);
  assert.equal(canSeeAssessment(restored), false);
});
