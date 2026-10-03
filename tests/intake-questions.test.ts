import test from "node:test";
import assert from "node:assert/strict";
import { emptyAssessment, answerFor, updateAnswer } from "../src/features/assessment/state.ts";
import { CORE_QUESTION_IDS, WINDOW_DIRECTION_IDS, questions } from "../src/features/assessment/questions.ts";
import type { AssessmentDraft } from "../src/features/assessment/state.ts";
import type { AnswerValue } from "../src/domain/models.ts";
import { allowedIntakeQuestions } from "../src/features/assessment/intake-questions.ts";
const at = "2026-10-03T00:00:00Z";
function answer(draft: AssessmentDraft, id: string, value: AnswerValue | null): AssessmentDraft {
  const question = questions.find(q => q.id === id)!;
  return updateAnswer(draft, question, answerFor(question, value, at));
}
function beforeWindows(): AssessmentDraft {
  let draft = emptyAssessment();
  for (const id of ["heatTiming", "position", "aboveRoom"]) draft = answer(draft, id, null);
  return draft;
}
test("assistance preserves core order and removes answered or inactive questions after the request starts", () => {
  let draft = emptyAssessment();
  const initial = allowedIntakeQuestions(draft);
  assert.deepEqual(initial, ["heatTiming"]);
  for (const id of CORE_QUESTION_IDS) {
    const question = questions.find(q => q.id === id)!;
    draft = updateAnswer(draft, question, answerFor(question, null, at));
    assert.equal(allowedIntakeQuestions(draft).includes(id), false);
  }
  assert.equal(allowedIntakeQuestions(draft).includes("coolingKwh"), false);
  const complaint = questions.find(q => q.id === "complaint")!;
  draft = updateAnswer(draft, complaint, answerFor(complaint, "Synthetic description", at));
  assert.equal(allowedIntakeQuestions(draft).includes("complaint"), false);
});

test("zero windows skips window core questions and excludes every optional window follow-up", () => {
  let draft = answer(beforeWindows(), "windowCount", 0);
  assert.deepEqual(allowedIntakeQuestions(draft), ["insulation"]);
  draft = answer(draft, "insulation", null);
  assert.deepEqual(allowedIntakeQuestions(draft), ["cooling"]);
  draft = answer(draft, "cooling", ["none"]);
  const allowed = allowedIntakeQuestions(draft);
  for (const id of [...WINDOW_DIRECTION_IDS, "windowOrientation", "externalShading", "internalCoverings", "windowsOpen", "ventilationConstraints"]) {
    assert.equal(allowed.includes(id), false, `${id} must not be offered for a windowless room`);
  }
  assert.equal(allowed.includes("location"), true);
});

test("unknown window count retains clarification and explicit Not sure is not repeatedly requested", () => {
  let draft = answer(beforeWindows(), "windowCount", null);
  assert.deepEqual(allowedIntakeQuestions(draft), ["windowOrientation"]);
  draft = answer(draft, "windowOrientation", null);
  assert.deepEqual(allowedIntakeQuestions(draft), ["externalShading"]);
});

test("changing the count invalidates a pending window question and restores the relevant branch", () => {
  let draft = answer(beforeWindows(), "windowCount", 2);
  assert.deepEqual(allowedIntakeQuestions(draft), ["window1Orientation"]);
  draft = answer(draft, "window1Orientation", "west");
  const pendingId = allowedIntakeQuestions(draft)[0]!;
  assert.equal(pendingId, "window2Orientation");
  draft = answer(draft, "windowCount", 0);
  assert.equal(allowedIntakeQuestions(draft).includes(pendingId), false);
  assert.deepEqual(allowedIntakeQuestions(draft), ["insulation"]);
  draft = answer(draft, "windowCount", 1);
  assert.deepEqual(allowedIntakeQuestions(draft), ["window1Orientation"]);
  draft = answer(draft, "window1Orientation", null);
  assert.deepEqual(allowedIntakeQuestions(draft), ["externalShading"]);
});
