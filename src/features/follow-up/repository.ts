import type { FollowUpCheckIn } from "../../domain/follow-up.ts";
import { assessmentRepository, type createAssessmentRepository } from "../assessment/repository.ts";
import type { AssessmentDraft } from "../assessment/state.ts";
import { followUp, isCheckInForPlan } from "./model.ts";

interface CheckInAssessmentDraft extends AssessmentDraft { followUpCheckIn: FollowUpCheckIn }
/** Uses the existing envelope: assessment reset deletes the plan and its check-in together. */
export function createFollowUpService(repository: ReturnType<typeof createAssessmentRepository>) {
  return {
    read(now: string) { return followUp(repository.getSnapshot().draft, now); },
    save(checkIn: FollowUpCheckIn) {
      const draft = repository.getSnapshot().draft;
      const expected = followUp(draft, checkIn.createdAt).checkIn;
      if (!expected || checkIn.savedAt.status !== "known" || !isCheckInForPlan(checkIn, expected)) throw new Error("Check-in no longer matches the saved plan");
      const prior = draft.followUpCheckIn;
      let history = draft.history ?? [];
      const plan = draft.coolingPlanDraft;
      if (prior?.savedAt.status === "known" && plan?.savedAt.status === "known" && prior.updatedAt !== checkIn.updatedAt) {
        const old = history.find(entry => entry.plan.id === plan.id);
        const checkIns = [...(old?.checkIns ?? []), prior].filter((c, i, all) => all.findIndex(other => other.updatedAt === c.updatedAt) === i).slice(-50);
        history = [...history.filter(entry => entry.plan.id !== plan.id), { plan: old?.plan ?? plan, checkIns, archivedAt: new Date().toISOString(), reason: old?.reason ?? "Earlier check-in retained before update." }].slice(-50);
      }
      const next: CheckInAssessmentDraft = { ...draft, history, followUpCheckIn: checkIn };
      repository.save(next);
      return repository.getSnapshot().notice === null;
    },
  };
}
export const followUpService = createFollowUpService(assessmentRepository);
