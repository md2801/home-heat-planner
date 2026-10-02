import type { PlannerService, ServiceResult } from "@/contracts/planner";

function notImplemented<T>(): Promise<ServiceResult<T>> {
  return Promise.resolve({ ok: false, error: {
    code: "not-implemented", message: "This feature is awaiting implementation.", retryable: false,
  } });
}

/** A contract-conforming stub. It fabricates no profile, evidence or saved result. */
export const mockPlannerService: PlannerService = {
  assessRoom: () => notImplemented(),
  clarify: () => notImplemented(),
  confirmProfile: () => notImplemented(),
  recommend: () => notImplemented(),
  compare: () => notImplemented(),
  savePlan: () => notImplemented(),
  recordFollowUp: () => notImplemented(),
};
