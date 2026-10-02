import { assessmentRepository } from "../features/assessment/repository.ts";
import { localPlannerAdapter } from "./journey-adapters.ts";
/** Optimistic local store with a replaceable typed calculation adapter. */
export const plannerClient = { ...assessmentRepository, execute: localPlannerAdapter.execute };
export const plannerService = localPlannerAdapter;
