import type { AssessmentDraft, AssessmentReview } from "../features/assessment/state.ts";
import { activeQuestions } from "../features/assessment/questions.ts";
import type { CoolingPlanDraft } from "../domain/cooling-plan.ts";
import type { FollowUpCheckIn } from "../domain/follow-up.ts";
import type { AssessmentAnswers, Comparison, Recommendation, RoomProfile, FinancialResult } from "../domain/models.ts";
import type { ReplacementInputs } from "../features/cooling-options/replacement.ts";
/** Transport values are independent of storage keys, database models and UI subscriptions. */
export interface AssessmentInput { answers: AssessmentAnswers; review?: AssessmentReview; replacement?: ReplacementInputs; sceneDetails?: NonNullable<AssessmentDraft["sceneDetails"]> }
export interface JourneyInput { schemaVersion: 1; assessment: AssessmentInput }
export type PlannerOperation = "assess" | "confirm" | "recommend" | "compare";
export interface PlannerCommand extends JourneyInput { operation: PlannerOperation }
export interface PlannerView { profile: RoomProfile; currentCoolingCost: FinancialResult | null; recommendations: Recommendation[]; comparisons: Comparison[]; missingInformation: string[]; review: AssessmentReview }
export type PlannerResult = { ok: true; data: PlannerView } | { ok: false; error: { code: "invalid-input" | "unavailable"; message: string; retryable: boolean } };
export interface PlanSaveRequest { assessmentId: string; plan: CoolingPlanDraft }
export interface CheckInSaveRequest { assessmentId: string; checkIn: FollowUpCheckIn }
export interface SaveResponse { saved: boolean; scope: "browser" | "server" }
export interface PlannerAdapter { execute(command: PlannerCommand): Promise<PlannerResult> }
export function assessmentInput(draft: AssessmentDraft): AssessmentInput {
  return { answers: draft.answers, ...(draft.sceneDetails ? { sceneDetails: draft.sceneDetails } : {}), ...(draft.review ? { review: draft.review } : {}), ...(draft.replacement ? { replacement: draft.replacement } : {}) };
}
/** UI cursor, selected plan, history and persistence metadata never cross this boundary. */
export function calculationDraft(input: AssessmentInput): AssessmentDraft {
  return { schemaVersion: 1, ...input, currentQuestionId: activeQuestions(input.answers)[0]!.id, completed: false };
}
