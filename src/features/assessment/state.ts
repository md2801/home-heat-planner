import type { AnswerValue, AssessmentAnswers, BaselineInputs, Fact, JourneyState, Period } from "../../domain/models.ts";
import { unknown } from "../../domain/unknown.ts";
import { createEmptyJourney } from "../journey/state.ts";
import { activeQuestions, CORE_QUESTION_IDS, questions, type Question } from "./questions.ts";
import { isReplacementInputs, type ReplacementInputs } from "../cooling-options/replacement.ts";
import type { CoolingPlanDraft } from "../../domain/cooling-plan.ts";
import type { FollowUpCheckIn } from "../../domain/follow-up.ts";
import { isHistory, safeJson, type PlanHistoryEntry } from "../../domain/history.ts";

export interface ReviewConfirmation { signature: string; recordedAt: string }
export interface AssessmentReview {
  room?: ReviewConfirmation;
  measuredScope?: ReviewConfirmation;
}
export interface AssessmentDraft {
  schemaVersion: 1;
  answers: AssessmentAnswers;
  currentQuestionId: string;
  completed: boolean;
  review?: AssessmentReview;
  replacement?: ReplacementInputs;
  coolingPlanDraft?: CoolingPlanDraft;
  followUpCheckIn?: FollowUpCheckIn;
  history?: PlanHistoryEntry[];
  selectedOption?: { actionId: "external-shading" | "ceiling-insulation" | "opening-review" | "ac-replacement"; assessmentSignature: string; recordedAt: string };
}
export function emptyAssessment(): AssessmentDraft {
  return { schemaVersion: 1, answers: {}, currentQuestionId: CORE_QUESTION_IDS[0], completed: false };
}
function record(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
export function validValue(question: Question, value: unknown): value is AnswerValue {
  if (question.kind === "choice") {
    const allowed = question.choices?.map(c => c.value) ?? [];
    if (!question.multiple) return allowed.some(option => option === value);
    return Array.isArray(value) && value.length > 0 && new Set(value).size === value.length && value.every(item => allowed.includes(item)) && !(value.includes("none") && value.length > 1);
  }
  if (question.kind === "number") return typeof value === "number" && Number.isFinite(value) && value >= (question.min ?? 0) && (question.max === undefined || value <= question.max) && (!question.integer || Number.isInteger(value));
  if (typeof value !== "string" || !value.trim() || value.length > (question.maxLength ?? 500)) return false;
  if (question.kind === "date") return /^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value;
  return true;
}
export function validAnswer(question: Question, answer: unknown): answer is Fact<AnswerValue> {
  if (!record(answer)) return false;
  if (answer.status === "unknown") return typeof answer.reason === "string" && !!answer.reason.trim();
  if (answer.status !== "known" || !validValue(question, answer.value) || !record(answer.provenance)) return false;
  const p = answer.provenance;
  const assumed = ["averageElectricalInputKw", "hoursPerDay", "coolingDays", "periodDescription"].includes(question.id);
  return p.kind === (assumed ? "assumed" : "user-reported") && typeof p.recordedAt === "string" && Number.isFinite(Date.parse(p.recordedAt)) && Array.isArray(p.sourceIds) && p.sourceIds.length === 0 && p.scope === `Bedroom assessment: ${question.id}`;
}
export function answerFor(question: Question, value: AnswerValue | null, recordedAt: string): Fact<AnswerValue> {
  if (value === null) return unknown("User selected Not sure");
  if (!validValue(question, value)) throw new Error("Invalid assessment answer");
  return { status: "known", value, provenance: {
    kind: ["averageElectricalInputKw", "hoursPerDay", "coolingDays", "periodDescription"].includes(question.id) ? "assumed" : "user-reported",
    recordedAt, sourceIds: [], scope: `Bedroom assessment: ${question.id}`,
  } };
}
export function canContinue(question: Question, answers: AssessmentAnswers): boolean {
  if (!validAnswer(question, answers[question.id])) return false;
  const start = answers.periodStart;
  const end = answers.periodEnd;
  return question.id !== "periodEnd" || start?.status !== "known" || end?.status !== "known" || String(end.value) >= String(start.value);
}
/** Explicit Not sure counts as a completed interaction, never as a known room fact. */
export function coreAssessmentComplete(answers: AssessmentAnswers): boolean {
  return CORE_QUESTION_IDS.every(id => canContinue(questions.find(q => q.id === id)!, answers));
}
export function canSeeAssessment(draft: AssessmentDraft): boolean {
  return coreAssessmentComplete(draft.answers) && activeQuestions(draft.answers).findIndex(q => q.id === draft.currentQuestionId) >= CORE_QUESTION_IDS.length;
}
export function finishAssessment(draft: AssessmentDraft): AssessmentDraft {
  return canSeeAssessment(draft) ? { ...draft, completed: true } : draft;
}
export function assessmentDestination(draft: AssessmentDraft): "/room-baseline" | null {
  return draft.completed && coreAssessmentComplete(draft.answers) ? "/room-baseline" : null;
}
/** Older drafts retain their answers when the question order changes. */
export function resumeAssessment(draft: AssessmentDraft): AssessmentDraft {
  if (coreAssessmentComplete(draft.answers) || CORE_QUESTION_IDS.some(id => id === draft.currentQuestionId)) return draft;
  const firstMissing = CORE_QUESTION_IDS.find(id => !canContinue(questions.find(q => q.id === id)!, draft.answers));
  return firstMissing ? { ...draft, currentQuestionId: firstMissing, completed: false } : draft;
}
export function updateAnswer(draft: AssessmentDraft, question: Question, answer: Fact<AnswerValue>): AssessmentDraft {
  if (!validAnswer(question, answer)) throw new Error("Invalid assessment answer");
  const answers = { ...draft.answers, [question.id]: answer };
  const active = new Set(activeQuestions(answers).map(q => q.id));
  for (const id of Object.keys(answers)) if (!active.has(id)) delete answers[id];
  // Changing a start date must not leave an apparently valid, stale end date.
  if ((question.id === "periodStart" || question.id === "periodEnd") && !canContinue(questions.find(q => q.id === "periodEnd")!, answers)) delete answers.periodEnd;
  return { ...draft, answers, completed: false };
}
export function moveAssessment(draft: AssessmentDraft, direction: "back" | "continue"): AssessmentDraft {
  const active = activeQuestions(draft.answers);
  const index = active.findIndex(q => q.id === draft.currentQuestionId);
  const question = active[index];
  if (!question || (direction === "continue" && !canContinue(question, draft.answers))) return draft;
  if (direction === "back") return { ...draft, currentQuestionId: active[Math.max(0, index - 1)]!.id, completed: false };
  if (index === active.length - 1) return coreAssessmentComplete(draft.answers) ? { ...draft, completed: true } : draft;
  return { ...draft, currentQuestionId: active[index + 1]!.id, completed: false };
}
function validReview(value: unknown): value is AssessmentReview {
  if (!record(value) || Object.keys(value).some(key => key !== "room" && key !== "measuredScope")) return false;
  return Object.values(value).every(item => record(item) && typeof item.signature === "string" && item.signature.length > 0 && typeof item.recordedAt === "string" && Number.isFinite(Date.parse(item.recordedAt)));
}
export function isAssessmentDraft(value: unknown): value is AssessmentDraft {
  if (!record(value) || value.schemaVersion !== 1 || !record(value.answers) || typeof value.currentQuestionId !== "string" || typeof value.completed !== "boolean") return false;
  if (value.review !== undefined && !validReview(value.review)) return false;
  if (value.replacement !== undefined && !isReplacementInputs(value.replacement)) return false;
  if (value.history !== undefined && !isHistory(value.history)) return false;
  if (value.coolingPlanDraft !== undefined && !safeJson(value.coolingPlanDraft)) return false;
  if (value.followUpCheckIn !== undefined && !safeJson(value.followUpCheckIn)) return false;
  if (value.selectedOption !== undefined) {
    const selection = value.selectedOption;
    if (!record(selection) || typeof selection.actionId !== "string" || !["external-shading", "ceiling-insulation", "opening-review", "ac-replacement"].includes(selection.actionId) || typeof selection.assessmentSignature !== "string" || !selection.assessmentSignature || typeof selection.recordedAt !== "string" || !Number.isFinite(Date.parse(selection.recordedAt))) return false;
  }
  const answers: AssessmentAnswers = {};
  for (const [id, answer] of Object.entries(value.answers)) {
    const q = questions.find(q => q.id === id);
    if (!q || !validAnswer(q, answer)) return false;
    answers[id] = answer;
  }
  const active = activeQuestions(answers);
  if (!active.some(q => q.id === value.currentQuestionId) || Object.keys(answers).some(id => !active.some(q => q.id === id))) return false;
  if (answers.periodEnd && !canContinue(questions.find(q => q.id === "periodEnd")!, answers)) return false;
  return !value.completed || (coreAssessmentComplete(answers) && (active.findIndex(q => q.id === value.currentQuestionId) >= CORE_QUESTION_IDS.length || active.every(q => canContinue(q, answers))));
}
function numeric(answers: AssessmentAnswers, id: string): Fact<number> {
  const answer = answers[id];
  return answer?.status === "known" && typeof answer.value === "number" ? { ...answer, value: answer.value } : unknown(answer?.status === "unknown" ? answer.reason : "Not provided");
}
/** Screen 3 can consume this typed journey; no profile is confirmed or cost calculated here. */
export function assessmentJourney(draft: AssessmentDraft): JourneyState {
  const journey = createEmptyJourney();
  journey.assessmentAnswers = draft.answers;
  const comfort = draft.answers.baselineComfortRating;
  const time = draft.answers.baselineComfortTime;
  if (comfort?.status === "known" && typeof comfort.value === "number" && comfort.value >= 1 && comfort.value <= 5) journey.baselineComfort = { ...comfort, value: { rating: { ...comfort, value: comfort.value as 1 | 2 | 3 | 4 | 5 }, timeOfDay: time?.status === "known" ? { ...time, value: time.value as import("../../domain/models.ts").HeatTiming } : unknown("Baseline time not recorded"), coolingUse: draft.answers.coolingUsage?.status === "known" ? { ...draft.answers.coolingUsage, value: String(draft.answers.coolingUsage.value) } : unknown("Cooling routine not recorded") } };
  journey.unknownFields = questions.filter(q => !draft.answers[q.id] || draft.answers[q.id]?.status === "unknown").map(q => q.id);
  const basis = draft.answers.energyBasis;
  if (basis?.status !== "known") return journey;
  const answers = draft.answers;
  let period: Fact<Period> = unknown("Cooling period not provided");
  const start = answers.periodStart, end = answers.periodEnd;
  const days = numeric(answers, "coolingDays"), description = answers.periodDescription;
  if (basis.value === "measured" && start?.status === "known" && end?.status === "known") {
    period = { status: "known", value: { kind: "date-range", start: String(start.value), end: String(end.value) }, provenance: end.provenance };
  } else if (basis.value === "scenario" && days.status === "known" && description?.status === "known") {
    period = { status: "known", value: { kind: "cooling-schedule", coolingDays: days.value, basis: "stated-period", description: String(description.value) }, provenance: description.provenance };
  }
  const inputs: BaselineInputs = {
    energy: basis.value === "measured" ? { kind: "measured", coolingKwh: numeric(answers, "coolingKwh") } : { kind: "electrical-input-scenario", averageElectricalInputKw: numeric(answers, "averageElectricalInputKw"), hoursPerDay: numeric(answers, "hoursPerDay"), coolingDays: days },
    period, flatTariffAudPerKwh: numeric(answers, "flatTariffAudPerKwh"), bedroomAttribution: unknown("Bedroom attribution and evidence must be confirmed at review"),
  };
  journey.baselineInputs = { status: "known", value: inputs, provenance: basis.provenance };
  return journey;
}
