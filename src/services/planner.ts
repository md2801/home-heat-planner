import type { PlannerService } from "@/contracts/planner";
import { mockPlannerService } from "./mocks/planner-service";

/** Pages will import this boundary; a future API adapter replaces only this selection. */
export const plannerService: PlannerService = mockPlannerService;
