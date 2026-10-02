import type {
  AssessmentAnswers, BaselineInputs, ClarificationAnswer, Comparison, CoolingPlan,
  FinancialResult, FollowUp, Recommendation, RoomProfile,
} from "@/domain/models";

export type ServiceErrorCode = "invalid-input" | "not-found" | "unavailable" | "not-implemented";
export type ServiceResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: { code: ServiceErrorCode; message: string; retryable: boolean } };

export interface AssessRoomRequest { assessmentId: string; answers: AssessmentAnswers }
export interface AssessRoomResponse { assessmentId: string; proposedProfile: RoomProfile | null; nextQuestionId: string | null; unknownFields: string[] }
export interface ClarifyRequest { assessmentId: string; clarification: ClarificationAnswer }
export interface ConfirmProfileRequest { assessmentId: string; profile: RoomProfile }
export interface RecommendRequest { assessmentId: string; profile: RoomProfile }
export interface RecommendResponse { options: Recommendation[]; missingInformation: string[] }
export interface CompareRequest { assessmentId: string; baseline: BaselineInputs; optionIds: string[] }
export interface CompareResponse { baseline: FinancialResult; comparisons: Comparison[] }
export interface SavePlanRequest { assessmentId: string; plan: CoolingPlan }
export interface RecordFollowUpRequest { followUp: FollowUp }

/** Transport DTOs are independent of browser storage or a future database schema. */
export interface PlannerService {
  assessRoom(request: AssessRoomRequest): Promise<ServiceResult<AssessRoomResponse>>;
  clarify(request: ClarifyRequest): Promise<ServiceResult<AssessRoomResponse>>;
  confirmProfile(request: ConfirmProfileRequest): Promise<ServiceResult<RoomProfile>>;
  recommend(request: RecommendRequest): Promise<ServiceResult<RecommendResponse>>;
  compare(request: CompareRequest): Promise<ServiceResult<CompareResponse>>;
  savePlan(request: SavePlanRequest): Promise<ServiceResult<CoolingPlan>>;
  recordFollowUp(request: RecordFollowUpRequest): Promise<ServiceResult<FollowUp>>;
}
