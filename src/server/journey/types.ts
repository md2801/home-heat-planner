import type { AssessmentInput, SaveResponse } from "../../contracts/journey.ts";
import type { CoolingPlanDraft } from "../../domain/cooling-plan.ts";
import type { FollowUpCheckIn } from "../../domain/follow-up.ts";
import type { PlanHistoryEntry } from "../../domain/history.ts";
import type { AssessmentDraft } from "../../features/assessment/state.ts";

/** Composes the shared DTOs; database credentials and revisions are never transported. */
export interface SavedJourney {
  assessment: AssessmentInput;
  selection: Pick<AssessmentDraft, "selectedOption" | "selectedTechniques">;
  plan: CoolingPlanDraft | null;
  followUp: FollowUpCheckIn | null;
  checkIns: FollowUpCheckIn[];
  history: PlanHistoryEntry[];
}
export interface AssessmentReceipt extends SaveResponse { assessmentId: string; accessToken?: string }
export interface JourneyRecord { document: SavedJourney; revision: number }
export interface JourneyStore {
  create(id: string, tokenHash: string, document: SavedJourney): Promise<void>;
  read(id: string, tokenHash: string): Promise<JourneyRecord | null>;
  replace(id: string, tokenHash: string, revision: number, document: SavedJourney): Promise<boolean>;
  remove(id: string, tokenHash: string): Promise<boolean>;
}
