import type { AssessmentDraft } from "./state.ts";
import { activeQuestions, CORE_QUESTION_IDS } from "./questions.ts";
/** Preserve core order; optional assistance can select only unanswered active questions. */
export function allowedIntakeQuestions(draft: AssessmentDraft): string[] {
  const active = activeQuestions(draft.answers);
  const firstCore = active.find(q => CORE_QUESTION_IDS.some(id => id === q.id) && !draft.answers[q.id]);
  return firstCore ? [firstCore.id] : active.filter(q => !draft.answers[q.id]).map(q => q.id);
}
