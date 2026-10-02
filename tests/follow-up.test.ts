import assert from "node:assert/strict";
import test from "node:test";
import type { AnswerValue } from "../src/domain/models.ts";
import { answerFor, emptyAssessment, isAssessmentDraft, updateAnswer, type AssessmentDraft } from "../src/features/assessment/state.ts";
import { questions } from "../src/features/assessment/questions.ts";
import { createAssessmentRepository } from "../src/features/assessment/repository.ts";
import { createBrowserPersistence } from "../src/lib/persistence/browser-storage.ts";
import { selectCoolingOption } from "../src/features/cooling-options/model.ts";
import { coolingPlan, saveCoolingPlan } from "../src/features/cooling-plan/model.ts";
import { createCoolingPlanService } from "../src/features/cooling-plan/repository.ts";
import { changeStatus, confirmComparableUsage, followUp, isCheckInForPlan, numericInput, observedUsage, saveCheckIn, statusChoices, updateNote, updateNumber, validNumber, updateFollowUpDetail, barrierSteps } from "../src/features/follow-up/model.ts";
import { createFollowUpService } from "../src/features/follow-up/repository.ts";
const at = "2026-10-03T00:00:00.000Z", later = "2026-10-03T00:01:00.000Z";
function fixture(values: Record<string, AnswerValue | null> = {}): AssessmentDraft {
  let draft = emptyAssessment();
  const answers: Record<string, AnswerValue | null> = { heatTiming: ["afternoon"], windowOrientation: ["west"], externalShading: "none", ...values };
  for (const q of questions) if (Object.hasOwn(answers, q.id)) draft = updateAnswer(draft, q, answerFor(q, answers[q.id]!, at));
  return selectCoolingOption(draft, "external-shading", at);
}
function repository() {
  const data = new Map<string, string>();
  const persistence = createBrowserPersistence("follow-up-test", isAssessmentDraft, () => ({ getItem: key => data.get(key) ?? null, setItem: (key, value) => { data.set(key, value); }, removeItem: key => { data.delete(key); } }));
  return { data, persistence, store: createAssessmentRepository(persistence) };
}
function saved(values: Record<string, AnswerValue | null> = {}) {
  const { store, persistence } = repository(); store.save(fixture(values));
  const planService = createCoolingPlanService(store);
  planService.persist(saveCoolingPlan(coolingPlan(store.getSnapshot().draft, at).plan!, at));
  const service = createFollowUpService(store);
  return { store, service, persistence, checkIn: service.read(at).checkIn! };
}
test("only an actual current saved plan enables a check-in; neither selection nor checklist completion fabricates it", () => {
  assert.equal(followUp(emptyAssessment(), at).checkIn, null);
  assert.equal(followUp(fixture(), at).checkIn, null);
  const { store, checkIn } = saved();
  const q = questions.find(q => q.id === "externalShading")!;
  store.save(updateAnswer(store.getSnapshot().draft, q, answerFor(q, "all", later)));
  assert.equal(followUp(store.getSnapshot().draft, later).checkIn, null);
  assert.equal(checkIn.status.status, "unknown");
  assert.throws(() => saveCheckIn(checkIn, later));
});
test("all five explicitly chosen statuses persist and restore across a fresh repository", () => {
  for (const choice of statusChoices) {
    const { service, persistence, checkIn } = saved();
    service.save(saveCheckIn(changeStatus(checkIn, choice.value, later), later));
    const reloaded = createAssessmentRepository(persistence); reloaded.hydrate();
    assert.deepEqual(createFollowUpService(reloaded).read(later).checkIn?.status, { status: "known", value: choice.value, provenance: { kind: "user-reported", recordedAt: later, sourceIds: [], scope: "Cooling plan check-in: status" } });
  }
});

test("baseline comfort is a saved snapshot; completed observations and later edits retain check-in history", () => {
  const { store, service, checkIn, persistence } = saved({ baselineComfortRating: 2, baselineComfortTime: "afternoon" });
  assert.equal(checkIn.earlierComfort?.status === "known" && checkIn.earlierComfort.value, 2);
  let completed = changeStatus(checkIn, "completed", later);
  completed = updateFollowUpDetail(completed, "completionDate", "2026-10-02", later);
  completed = updateFollowUpDetail(completed, "comfortTime", "afternoon", later);
  completed = updateNumber(completed, "laterCoolingKwh", 0, later);
  completed = updateNumber(completed, "laterTariff", 0.3, later);
  completed = updateFollowUpDetail(completed, "usagePeriod", "Synthetic same meter; cooler weather, different routine", later);
  assert.throws(() => updateFollowUpDetail(completed, "completionDate", "2099-10-01", later));
  service.save(saveCheckIn(completed, later));
  const q = questions.find(q => q.id === "baselineComfortRating")!;
  store.save(updateAnswer(store.getSnapshot().draft, q, answerFor(q, 4, later)));
  const baselineComfort = service.read(later).checkIn?.earlierComfort;
  assert.equal(baselineComfort?.status === "known" && baselineComfort.value, 2);
  const nextTime = "2026-10-03T00:02:00.000Z";
  service.save(saveCheckIn(updateNote(completed, "Second synthetic check-in", nextTime), nextTime));
  const material = questions.find(q => q.id === "budgetAud")!;
  store.save(updateAnswer(store.getSnapshot().draft, material, answerFor(material, 1, nextTime)));
  assert.equal(store.getSnapshot().draft.history?.[0]?.checkIns.length, 2);
  const reloaded = createAssessmentRepository(persistence); reloaded.hydrate();
  assert.equal(reloaded.getSnapshot().draft.history?.[0]?.checkIns.length, 2);
  assert.equal(createFollowUpService(reloaded).read(nextTime).checkIn, null);
});

test("deferred barriers provide next steps without completion data or fabricated outcomes", () => {
  const { service, persistence, checkIn } = saved();
  let deferred = changeStatus(checkIn, "deferred", later);
  deferred = updateFollowUpDetail(deferred, "barrier", "permission", later);
  assert.match(barrierSteps.permission, /approve/);
  assert.throws(() => updateFollowUpDetail(deferred, "completionDate", "2026-10-02", later));
  assert.throws(() => updateNumber(deferred, "laterCoolingKwh", 1, later));
  service.save(saveCheckIn(deferred, later));
  const reloaded = createAssessmentRepository(persistence); reloaded.hydrate();
  assert.deepEqual(createFollowUpService(reloaded).read(later).checkIn?.barrier, deferred.barrier);
  assert.equal(observedUsage(deferred), null);
});
test("completed optional actual spend, hours, comfort and note survive reload without generating savings", () => {
  const { service, persistence, checkIn } = saved();
  let completed = changeStatus(checkIn, "completed", later);
  completed = updateNumber(completed, "actualCostAud", 320, later);
  completed = updateNumber(completed, "currentHoursPerDay", 4.5, later);
  completed = updateNumber(completed, "comfortRating", 4, later);
  completed = updateNote(completed, "Reviewed a scoped quote, no installation reported", later);
  service.save(saveCheckIn(completed, later));
  const reloaded = createAssessmentRepository(persistence); reloaded.hydrate();
  const view = createFollowUpService(reloaded).read(later);
  assert.equal(view.checkIn?.actualCostAud.status, "known");
  assert.deepEqual(view.checkIn?.currentHoursPerDay, completed.currentHoursPerDay);
  assert.deepEqual(view.checkIn?.comfortRating, completed.comfortRating);
  assert.equal(view.plan?.status, "planned");
  assert.equal(view.plan?.comparisonSnapshot.status === "known" && view.plan.comparisonSnapshot.value.simplePaybackYears.status, "unknown");
  assert.equal(view.plan?.upfrontCostAud.status, "unknown");
});
test("empty optional values stay unknown, while valid zero spend and usage remain zero", () => {
  const { checkIn } = saved(); const completed = changeStatus(checkIn, "completed", later);
  for (const field of ["actualCostAud", "currentHoursPerDay", "comfortRating"] as const) assert.equal(completed[field].status, "unknown");
  assert.deepEqual(numericInput("actualCostAud", "  "), { value: null, error: null });
  assert.equal(updateNote(completed, "  ", later).note.status, "unknown");
  const zero = updateNumber(updateNumber(completed, "actualCostAud", 0, later), "currentHoursPerDay", 0, later);
  assert.equal(zero.actualCostAud.status === "known" && zero.actualCostAud.value, 0);
  assert.equal(zero.currentHoursPerDay.status === "known" && zero.currentHoursPerDay.value, 0);
});
test("hours, money, rating and note validation reject invalid observations calmly", () => {
  for (const value of [-1, 24.1, NaN, Infinity]) assert.equal(validNumber("currentHoursPerDay", value), false);
  for (const value of [0, 1.5, 6, NaN]) assert.equal(validNumber("comfortRating", value), false);
  assert.equal(validNumber("currentHoursPerDay", 24), true);
  assert.equal(validNumber("comfortRating", 5), true);
  for (const raw of ["-1", "no", "1e4", "Infinity"]) assert.ok(numericInput("actualCostAud", raw).error);
  const completed = changeStatus(saved().checkIn, "completed", later);
  assert.throws(() => updateNumber(completed, "actualCostAud", -1, later));
  assert.throws(() => updateNumber(completed, "currentHoursPerDay", 25, later));
  assert.throws(() => updateNumber(completed, "comfortRating", 1.5, later));
  assert.throws(() => updateNote(completed, "x".repeat(501), later));
});
test("scenario hours are not observed facts without an explicit confirmation of comparable actual usage", () => {
  const { checkIn } = saved({ cooling: ["air-conditioner"], energyBasis: "scenario", hoursPerDay: 6 });
  let completed = updateNumber(changeStatus(checkIn, "completed", later), "currentHoursPerDay", 4.5, later);
  assert.equal(completed.earlierHoursPerDay.status === "known" && completed.earlierHoursPerDay.provenance.kind, "assumed");
  assert.equal(observedUsage(completed), null);
  completed = confirmComparableUsage(completed, true, later);
  assert.deepEqual(observedUsage(completed), { before: 6, now: 4.5, difference: -1.5 });
  assert.equal(completed.earlierHoursPerDay.status === "known" && completed.earlierHoursPerDay.provenance.kind, "assumed");
  assert.equal(observedUsage(confirmComparableUsage(completed, false, later)), null);
  assert.equal(observedUsage(updateNumber(completed, "currentHoursPerDay", null, later)), null);
  assert.deepEqual(observedUsage(updateNumber(completed, "currentHoursPerDay", 7, later)), { before: 6, now: 7, difference: 1 });
});
test("no baseline hours means no comparison, including measured kWh with no daily operating hours", () => {
  for (const values of [{}, { cooling: ["air-conditioner"], energyBasis: "measured", coolingKwh: 80 }] as Record<string, AnswerValue>[]) {
    const { checkIn } = saved(values);
    const completed = updateNumber(changeStatus(checkIn, "completed", later), "currentHoursPerDay", 4.5, later);
    assert.equal(observedUsage(completed), null);
    assert.equal(completed.earlierHoursPerDay.status, "unknown");
    assert.throws(() => confirmComparableUsage(completed, true, later));
  }
});
test("status transitions clear incompatible cost, usage, comfort, confirmation and notes deliberately", () => {
  const { checkIn } = saved({ cooling: ["air-conditioner"], energyBasis: "scenario", hoursPerDay: 6 });
  let completed = changeStatus(checkIn, "completed", later);
  completed = updateNote(updateNumber(updateNumber(updateNumber(completed, "actualCostAud", 100, later), "currentHoursPerDay", 4, later), "comfortRating", 3, later), "Completed review", later);
  completed = confirmComparableUsage(completed, true, later);
  assert.deepEqual(changeStatus(completed, "completed", later), completed);
  for (const status of ["not-started", "started", "stuck"] as const) {
    const next = changeStatus(completed, status, later);
    for (const field of ["actualCostAud", "currentHoursPerDay", "comfortRating", "note", "comparableUsageConfirmed"] as const) assert.equal(next[field].status, "unknown");
    assert.equal(observedUsage(next), null);
    assert.throws(() => updateNumber(next, "actualCostAud", 1, later));
    assert.equal(changeStatus(next, "completed", later).currentHoursPerDay.status, "unknown");
  }
});
test("started/stuck notes persist without pretending an installation is complete; assessment reset clears them", () => {
  const { service, store, persistence, checkIn } = saved();
  const stuck = updateNote(changeStatus(checkIn, "stuck", later), "Need permission before arranging work", later);
  service.save(saveCheckIn(stuck, later));
  const reloaded = createAssessmentRepository(persistence); reloaded.hydrate();
  assert.deepEqual(createFollowUpService(reloaded).read(later).checkIn?.note, stuck.note);
  assert.equal(service.read(later).plan?.status, "planned");
  store.clear(); assert.equal(service.read(later).checkIn, null);
  reloaded.clear(); assert.equal(persistence.load().ok && reloaded.getSnapshot().draft.selectedOption, undefined);
});
test("check-in association and immutable baseline snapshots reject another action, invented numbers or corrupt data", () => {
  const { service, checkIn } = saved();
  const savedCheckIn = saveCheckIn(changeStatus(checkIn, "completed", later), later);
  for (const corrupted of [{ ...savedCheckIn, actionId: "ceiling-insulation" }, { ...savedCheckIn, planId: "different" }, { ...savedCheckIn, interpretation: "causal" }, { ...savedCheckIn, earlierHoursPerDay: { status: "known", value: 6 } }, { ...savedCheckIn, actualCostAud: { status: "known", value: -1 } }]) {
    assert.equal(isCheckInForPlan(corrupted, checkIn), false);
    assert.throws(() => service.save(corrupted as typeof checkIn));
  }
  assert.equal(savedCheckIn.actionId, "external-shading");
  assert.equal(savedCheckIn.planId, service.read(at).plan?.id);
});
test("blocked browser storage reports failure and retains the explicit saved check-in in this tab", () => {
  const store = createAssessmentRepository(createBrowserPersistence("blocked-follow-up", isAssessmentDraft, () => { throw new Error("blocked"); }));
  store.save(fixture());
  createCoolingPlanService(store).persist(saveCoolingPlan(coolingPlan(store.getSnapshot().draft, at).plan!, at));
  const service = createFollowUpService(store);
  assert.equal(service.save(saveCheckIn(changeStatus(service.read(at).checkIn!, "started", later), later)), false);
  assert.ok(store.getSnapshot().notice);
  assert.equal(service.read(later).checkIn?.savedAt.status, "known");
});
