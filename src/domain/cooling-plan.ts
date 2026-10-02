import type { CoolingPlan, EstimateStatus, EvidenceSource, Fact, NumericRange } from "./models.ts";

export type CheckInChoice = "7-days" | "14-days" | "custom";
/** A locally saved investigation plan, retaining the comparison's original provenance. */
export interface CoolingPlanDraft extends CoolingPlan {
  schemaVersion: 1;
  selectedActionLabel: string;
  selectionSignature: string;
  createdAt: string;
  updatedAt: string;
  savedAt: Fact<string>;
  checkInChoice: Fact<CheckInChoice>;
  financialStatus: EstimateStatus;
  upfrontCostAud: Fact<number | NumericRange>;
  evidence: EvidenceSource[];
  catalogueVersion: string;
  checklistVersion: string;
}
