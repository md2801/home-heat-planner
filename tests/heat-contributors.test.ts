import assert from "node:assert/strict";
import test from "node:test";
import type { AnswerValue } from "../src/domain/models.ts";
import { answerFor, emptyAssessment, finishAssessment, moveAssessment, updateAnswer, type AssessmentDraft } from "../src/features/assessment/state.ts";
import { CORE_QUESTION_IDS, questions } from "../src/features/assessment/questions.ts";
import { assessContributors } from "../src/features/heat-contributors/model.ts";
import { contributorEvidence } from "../src/features/heat-contributors/evidence.ts";
import { createAssessmentRepository } from "../src/features/assessment/repository.ts";
import { createBrowserPersistence } from "../src/lib/persistence/browser-storage.ts";
import { isAssessmentDraft } from "../src/features/assessment/state.ts";

const at = "2026-10-02T00:00:00.000Z";
function fixture(values: Record<string, AnswerValue | null>): AssessmentDraft {
  let draft = emptyAssessment();
  for (const q of questions) if (Object.hasOwn(values, q.id)) draft = updateAnswer(draft, q, answerFor(q, values[q.id]!, at));
  return draft;
}
const solar = { heatTiming: ["afternoon"], windowOrientation: ["west"], externalShading: "none" };
test("matching supplied heat timing, direction and absent shading support a plausible window contributor", () => {
  for (const values of [solar, { ...solar, heatTiming: ["evening"] }, { heatTiming: ["morning"], windowOrientation: ["east"], externalShading: "none" }]) {
    const view = assessContributors(fixture(values));
    assert.equal(view.contributors[0]?.id, "window-solar");
    assert.equal(view.contributors[0]?.status, "likely-contributor");
    assert.equal(view.illustration.sun, true);
    assert.deepEqual(view.contributors[0]?.reasons.map(r => r.fieldId), ["heatTiming", "windowOrientation", "externalShading"]);
    assert.ok(view.contributors[0]?.reasons.every(r => r.fact.status === "known" && r.fact.provenance.kind === "user-reported"));
  }
});
test("unknown shade and direction stay unknown; incomplete exposure is an investigation, not an absent shade claim", () => {
  const draft = fixture({ ...solar, externalShading: null });
  const before = JSON.stringify(draft);
  const view = assessContributors(draft);
  assert.equal(view.contributors[0]?.status, "worth-checking");
  assert.equal(view.contributors[0]?.reasons.find(r => r.fieldId === "externalShading")?.fact.status, "unknown");
  assert.ok(view.contributors[0]?.unknowns.includes("External shading · Not sure"));
  assert.equal(view.illustration.sun, false);
  assert.equal(JSON.stringify(draft), before);
  const noDirection = assessContributors(fixture({ ...solar, windowOrientation: null }));
  assert.equal(noDirection.contributors[0]?.status, "worth-checking");
  assert.equal(noDirection.contributors[0]?.reasons.find(r => r.fieldId === "windowOrientation")?.value, "Not sure");
});
test("already shaded windows and mismatched direction/timing do not select the window opportunity", () => {
  for (const values of [{ ...solar, externalShading: "all" }, { ...solar, windowOrientation: ["south"] }, { ...solar, heatTiming: ["overnight"] }, { ...solar, heatTiming: null }]) {
    assert.equal(assessContributors(fixture(values)).contributors.some(c => c.id === "window-solar"), false);
  }
});
test("room-wide reports of some shade do not establish which window is unshaded", () => {
  const view = assessContributors(fixture({ ...solar, windowOrientation: ["west", "north"], externalShading: "some" }));
  assert.equal(view.contributors[0]?.status, "worth-checking");
  assert.ok(view.contributors[0]?.unknowns.some(s => s.includes("Which windows")));
  assert.equal(view.illustration.sun, false);
});
test("reported roof above and absent insulation support a plausible roof/ceiling contributor", () => {
  const view = assessContributors(fixture({ aboveRoom: "roof", insulation: false }));
  assert.equal(view.contributors[0]?.id, "roof-ceiling");
  assert.equal(view.contributors[0]?.status, "likely-contributor");
  assert.equal(view.contributors[0]?.reasons[1]?.value, "Reported absent");
  assert.equal(view.illustration.roof, true);
});
test("unknown insulation stays unknown and only suggests confirmation", () => {
  const view = assessContributors(fixture({ aboveRoom: "roof", insulation: null }));
  assert.equal(view.contributors[0]?.status, "worth-checking");
  assert.equal(view.contributors[0]?.reasons[1]?.fact.status, "unknown");
  assert.equal(view.contributors[0]?.reasons[1]?.value, "Not sure");
  assert.equal(view.illustration.roof, false);
});
test("another room/dwelling or upper-floor position alone never implies roof exposure", () => {
  for (const aboveRoom of ["another-room", "another-dwelling", null]) {
    const view = assessContributors(fixture({ position: "upper-floor", aboveRoom, insulation: false }));
    assert.equal(view.contributors.some(c => c.id === "roof-ceiling"), false);
    assert.equal(view.illustration.roof, false);
  }
  assert.equal(assessContributors(fixture({ aboveRoom: "roof", insulation: true })).contributors.length, 0);
});
test("opening restrictions support an investigation without claiming measured airflow", () => {
  const none = assessContributors(fixture({ windowsOpen: "none" }));
  assert.equal(none.contributors[0]?.id, "ventilation-limit");
  assert.equal(none.contributors[0]?.status, "likely-contributor");
  const some = assessContributors(fixture({ windowsOpen: "some" }));
  assert.equal(some.contributors[0]?.status, "worth-checking");
  const noise = assessContributors(fixture({ windowsOpen: "all", ventilationConstraints: "Traffic noise keeps me from opening them at night" }));
  assert.equal(noise.contributors[0]?.id, "ventilation-limit");
  assert.match(noise.contributors[0]?.reasons[1]?.value ?? "", /Traffic noise/);
  assert.ok(noise.contributors[0]?.unknowns.some(s => s.includes("Actual airflow")));
});
test("openable windows and explicit no-known-limits text do not establish a ventilation cause", () => {
  for (const values of [{ windowsOpen: "all" }, { windowsOpen: "all", ventilationConstraints: "No known limits" }, { windowsOpen: null, ventilationConstraints: "No known limits." }]) {
    assert.equal(assessContributors(fixture(values)).contributors.length, 0);
  }
});
test("sparse core-only early exit gives useful gaps without manufactured contributors", () => {
  let draft = emptyAssessment();
  for (const id of CORE_QUESTION_IDS) {
    const q = questions.find(q => q.id === id)!;
    draft = moveAssessment(updateAnswer(draft, q, answerFor(q, null, at)), "continue");
  }
  draft = finishAssessment(draft);
  assert.equal(draft.completed, true);
  const view = assessContributors(draft);
  assert.deepEqual(view.contributors, []);
  assert.ok(view.gaps.includes("Insulation · Not sure"));
  assert.ok(view.context.every(c => c.value === "Not sure"));
  assert.equal(assessContributors(emptyAssessment()).contributors.length, 0);
});
test("multiple simultaneous contributors retain stable IDs, reasons and actual guidance references", () => {
  const view = assessContributors(fixture({ ...solar, aboveRoom: "roof", insulation: false, windowsOpen: "none" }));
  assert.deepEqual(view.contributors.map(c => c.id), ["window-solar", "roof-ceiling", "ventilation-limit"]);
  assert.ok(view.contributors.every(c => c.sourceIds.every(id => contributorEvidence.some(source => source.id === id))));
  assert.ok(view.contributors.every(c => c.reasons.length > 0));
});
test("cooling and internal coverings remain context; financial assumptions do not become room evidence", () => {
  const draft = fixture({ cooling: ["air-conditioner"], internalCoverings: ["curtains"], energyBasis: "scenario", averageElectricalInputKw: 1, ...solar });
  const view = assessContributors(draft);
  assert.deepEqual(view.contributors.map(c => c.id), ["window-solar"]);
  assert.equal(view.context.find(c => c.id === "cooling")?.value, "Air conditioner");
  const timing = draft.answers.heatTiming;
  assert.ok(timing?.status === "known");
  const assumed = { ...draft, answers: { ...draft.answers, heatTiming: { ...timing, provenance: { ...timing.provenance, kind: "assumed" as const } } } };
  assert.equal(assessContributors(assumed).contributors.length, 0);
});
test("persisted answers survive repository hydration and edits deterministically update contributors", () => {
  const data = new Map<string, string>();
  const persistence = createBrowserPersistence("contributors-test", isAssessmentDraft, () => ({ getItem: key => data.get(key) ?? null, setItem: (key, value) => { data.set(key, value); }, removeItem: key => { data.delete(key); } }));
  const first = createAssessmentRepository(persistence);
  const draft = fixture(solar);
  first.save(draft);
  const refreshed = createAssessmentRepository(persistence);
  refreshed.hydrate();
  assert.deepEqual(assessContributors(refreshed.getSnapshot().draft), assessContributors(draft));
  const shade = questions.find(q => q.id === "externalShading")!;
  refreshed.save(updateAnswer(refreshed.getSnapshot().draft, shade, answerFor(shade, "all", at)));
  assert.equal(assessContributors(refreshed.getSnapshot().draft).contributors.length, 0);
});
