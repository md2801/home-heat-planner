import type { JourneyState } from "@/domain/models";
import { unknown } from "../../domain/unknown.ts";

export function createEmptyJourney(): JourneyState {
  return {
    schemaVersion: 1,
    assessmentAnswers: {},
    clarificationAnswers: [],
    confirmedProfile: unknown("Room profile not confirmed"),
    unknownFields: [],
    baselineInputs: unknown("Cooling inputs not provided"),
    currentCoolingCost: unknown("Cooling cost not calculated"),
    recommendations: [],
    comparisons: [],
    selectedActionId: unknown("No action selected"),
    plan: unknown("No plan created"),
    baselineComfort: unknown("Comfort not reported"),
    followUps: [],
  };
}
