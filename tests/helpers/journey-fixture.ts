import type { AnswerValue } from "../../src/domain/models.ts";
import { answerFor, emptyAssessment, updateAnswer, type AssessmentDraft } from "../../src/features/assessment/state.ts";
import { questions } from "../../src/features/assessment/questions.ts";
import { confirmScene } from "../../src/features/room-scene/confirm-scene.ts";
import { confirmRoomReview } from "../../src/features/room-baseline/model.ts";
import { selectCoolingOption } from "../../src/features/cooling-options/model.ts";
import { coolingPlan, chooseCheckIn, saveCoolingPlan } from "../../src/features/cooling-plan/model.ts";
import { followUp, changeStatus, updateNumber, saveCheckIn } from "../../src/features/follow-up/model.ts";
export const at = "2026-10-04T00:00:00.000Z";
export const later = "2026-10-04T00:01:00.000Z";
export const after = "2026-10-04T00:02:00.000Z";
export function answer(draft: AssessmentDraft, id: string, value: AnswerValue | null, time = at) {
  const question = questions.find(q => q.id === id)!;
  return updateAnswer(draft, question, answerFor(question, value, time));
}
export function journeyFixture() {
  let draft = answer(emptyAssessment(), "heatTiming", ["afternoon"]);
  draft = confirmScene(draft, { version: 1, above: "roof", bed: "present", windows: [{ direction: "west", covering: "curtains", shade: "none" }, { direction: "unknown", covering: "blinds", shade: "awning" }], equipment: [] }, at);
  draft = answer(draft, "insulation", null);
  draft = confirmRoomReview(draft, at);
  draft = selectCoolingOption(draft, "ceiling-insulation", at);
  const plan = saveCoolingPlan(chooseCheckIn(coolingPlan(draft, at).plan!, "custom", later, "2026-10-18"), later);
  const initial = followUp({ ...draft, coolingPlanDraft: plan }, later).checkIn!;
  const checkIn = saveCheckIn(updateNumber(changeStatus(initial, "completed", after), "actualCostAud", 0, after), after);
  return { draft, plan, checkIn };
}
