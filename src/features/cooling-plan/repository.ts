import type { CoolingPlanDraft } from "../../domain/cooling-plan.ts";
import { assessmentRepository, type createAssessmentRepository } from "../assessment/repository.ts";
import type { AssessmentDraft } from "../assessment/state.ts";
import { coolingPlan, isPlanForSelection } from "./model.ts";

export interface PlanAssessmentDraft extends AssessmentDraft { coolingPlanDraft?: CoolingPlanDraft }
/** Shares the assessment envelope, so existing edits preserve the plan and reset deletes it. */
export function createCoolingPlanService(repository: ReturnType<typeof createAssessmentRepository>) {
  return {
    read(now: string) { return coolingPlan(repository.getSnapshot().draft, now); },
    persist(plan: CoolingPlanDraft) {
      const draft = repository.getSnapshot().draft;
      const expected = coolingPlan(draft, plan.createdAt).plan;
      if (!expected || !isPlanForSelection(plan, expected)) throw new Error("Plan no longer matches the selected comparison");
      const next: PlanAssessmentDraft = { ...draft, coolingPlanDraft: plan };
      repository.save(next);
      return repository.getSnapshot().notice === null;
    },
  };
}
export const coolingPlanService = createCoolingPlanService(assessmentRepository);
