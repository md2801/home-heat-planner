import test from "node:test";
import assert from "node:assert/strict";
import { activeQuestions, CORE_QUESTION_IDS, questions, WINDOW_DIRECTION_IDS } from "../src/features/assessment/questions.ts";
import { answerFor, emptyAssessment, updateAnswer, moveAssessment, resumeAssessment, coreAssessmentComplete, isAssessmentDraft, type AssessmentDraft } from "../src/features/assessment/state.ts";
import { assessmentScene } from "../src/features/room-scene/assessment-scene.ts";
import { confirmScene } from "../src/features/room-scene/confirm-scene.ts";
import { emptyScene } from "../src/contracts/room-scene.ts";
import { proposedRoomProfile } from "../src/features/room-baseline/model.ts";
import { materialSignature } from "../src/domain/material-signature.ts";
import { allowedIntakeQuestions } from "../src/features/assessment/intake-questions.ts";
import { assessmentInput } from "../src/contracts/journey.ts";
import { isPlannerCommand } from "../src/contracts/validation.ts";
import type { AnswerValue } from "../src/domain/models.ts";
const at = "2026-10-03T07:00:00Z";
function answer(draft: AssessmentDraft, id: string, value: AnswerValue | null) {
  const q = questions.find(q => q.id === id)!;
  return updateAnswer(draft, q, answerFor(q, value, at));
}
test("known counts ask exactly one direction per window immediately after count, with navigation and explicit unknown", () => {
  for (const count of [1, 2, 3, 4]) {
    let d = answer({ ...emptyAssessment(), currentQuestionId: "windowCount" }, "windowCount", count);
    const ids = activeQuestions(d.answers).map(q => q.id);
    assert.deepEqual(ids.slice(ids.indexOf("windowCount") + 1, ids.indexOf("externalShading")), WINDOW_DIRECTION_IDS.slice(0, count));
    d = moveAssessment(d, "continue");
    for (const id of WINDOW_DIRECTION_IDS.slice(0, count)) {
      assert.equal(d.currentQuestionId, id);
      assert.equal(moveAssessment(d, "continue"), d);
      d = moveAssessment(answer(d, id, id === "window1Orientation" ? "west" : null), "continue");
    }
    assert.equal(d.currentQuestionId, "externalShading");
    assert.equal(moveAssessment(d, "back").currentQuestionId, WINDOW_DIRECTION_IDS[count - 1]);
    assert.equal(isAssessmentDraft(JSON.parse(JSON.stringify(d))), true);
  }
});
test("changing count prunes removed windows, skips zero, and does not fabricate directions for new windows", () => {
  let d = answer(emptyAssessment(), "windowCount", 3);
  d = answer(answer(answer(d, "window1Orientation", "west"), "window2Orientation", "north"), "window3Orientation", "east");
  d = answer({ ...d, currentQuestionId: "window3Orientation" }, "windowCount", 1);
  assert.equal(d.currentQuestionId, "windowCount");
  assert.equal(d.answers.window2Orientation, undefined);
  assert.equal(d.answers.window3Orientation, undefined);
  d = answer(d, "windowCount", 2);
  assert.equal(assessmentScene(d.answers).windows?.[1]?.direction, "unknown");
  d = answer(d, "windowCount", 0);
  assert.ok(WINDOW_DIRECTION_IDS.every(id => !d.answers[id]));
  assert.deepEqual(assessmentScene(d.answers).windows, []);
  for (const count of [null, "more-than-four"] as const) {
    d = answer(d, "windowCount", count);
    assert.ok(activeQuestions(d.answers).some(q => q.id === "windowOrientation"));
    assert.ok(!activeQuestions(d.answers).some(q => WINDOW_DIRECTION_IDS.some(id => id === q.id)));
  }
});
test("individual facts retain their window pairing in preview, profile, transport and material changes", () => {
  let d = answer(emptyAssessment(), "windowCount", 2);
  d = answer(answer(d, "window1Orientation", "west"), "window2Orientation", "north-east");
  const profile = proposedRoomProfile(d, at);
  assert.equal(profile.windows.status, "known");
  if (profile.windows.status !== "known") throw new Error("Missing windows");
  assert.deepEqual(profile.windows.value.map(w => w.orientation.status === "known" ? w.orientation.value : null), ["west", "north-east"]);
  assert.deepEqual(profile.windowSummary?.orientations.status === "known" && profile.windowSummary.orientations.value, ["west", "north-east"]);
  assert.ok(profile.windows.value.every(w => w.externalShading.status === "unknown" && w.opens.status === "unknown"));
  assert.deepEqual(assessmentScene(d.answers).windows?.map(w => w.direction), ["west", "north-east"]);
  assert.equal(isPlannerCommand({ schemaVersion: 1, operation: "assess", assessment: assessmentInput(d) }), true);
  const changed = answer(d, "window2Orientation", null);
  assert.notEqual(materialSignature(changed), materialSignature(d));
  assert.equal(proposedRoomProfile(changed, at).windowSummary?.orientations.status, "unknown");
  assert.deepEqual(assessmentScene(changed.answers).windows?.map(w => w.direction), ["west", "unknown"]);
});
test("legacy completed reports resume individual questions without loss, and intake follows active core order", () => {
  let d = answer(emptyAssessment(), "windowCount", 2);
  for (const id of CORE_QUESTION_IDS.filter(id => id !== "windowCount" && !WINDOW_DIRECTION_IDS.some(w => w === id))) d = answer(d, id, id === "windowOrientation" ? ["west", "north"] : null);
  d = { ...d, currentQuestionId: "location", completed: true };
  assert.equal(isAssessmentDraft(d), true);
  const restored = resumeAssessment(JSON.parse(JSON.stringify(d)));
  assert.equal(restored.currentQuestionId, "window1Orientation");
  assert.deepEqual(restored.answers, d.answers);
  assert.equal(coreAssessmentComplete(restored.answers), false);
  assert.deepEqual(allowedIntakeQuestions(restored), ["window1Orientation"]);
  const first = answer(restored, "window1Orientation", "north");
  assert.deepEqual(allowedIntakeQuestions(first), ["window2Orientation"]);
  assert.deepEqual(assessmentScene(first.answers).windows?.map(w => w.direction), ["north", "unknown"]);
});
test("scene confirmation fills individual answers and manual unknown does not restore stale scene directions", () => {
  const scene = { ...emptyScene(), windows: [{ direction: "west" as const, covering: "curtains" as const, shade: "none" as const }, { direction: "north" as const, covering: "blinds" as const, shade: "awning" as const }] };
  let d = confirmScene(emptyAssessment(), scene, at);
  assert.equal(d.answers.window1Orientation?.status === "known" && d.answers.window1Orientation.value, "west");
  assert.equal(d.answers.window2Orientation?.status === "known" && d.answers.window2Orientation.value, "north");
  d = answer(d, "window2Orientation", null);
  const current = assessmentScene(d.answers, d.sceneDetails);
  assert.equal(current.windows?.[0]?.direction, "west");
  assert.equal(current.windows?.[1]?.direction, "unknown");
  assert.equal(current.windows?.[1]?.covering, "blinds");
  assert.equal(current.windows?.[1]?.shade, "awning");
});
