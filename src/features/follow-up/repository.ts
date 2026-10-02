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
      const next: CheckInAssessmentDraft = { ...draft, followUpCheckIn: checkIn };
      repository.save(next);
      return repository.getSnapshot().notice === null;
    },
  };
}
export const followUpService = createFollowUpService(assessmentRepository);
