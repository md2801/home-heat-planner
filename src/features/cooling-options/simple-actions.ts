import type { AssessmentDraft } from "../assessment/state.ts";
import { techniques } from "../knowledge-base/catalogue.ts";
import { recommendationResources } from "../knowledge-base/recommendation-resources.ts";
import { coolingResearchContext } from "./research-context.ts";
import { materialSignature } from "../../domain/material-signature.ts";

export function availableSimpleActions(draft: AssessmentDraft) {
  const allowed = recommendationResources(coolingResearchContext(draft)).techniqueIds;
  return techniques.filter(t => allowed.includes(t.id) && t.effort !== "plan-ahead");
}
export function selectedSimpleActions(draft: AssessmentDraft) {
  const selection = draft.selectedTechniques;
  if (!selection || selection.assessmentSignature !== materialSignature(draft)) return [];
  return availableSimpleActions(draft).filter(t => selection.ids.includes(t.id));
}
export function toggleSimpleAction(draft: AssessmentDraft, id: string, now: string): AssessmentDraft {
  if (!availableSimpleActions(draft).some(t => t.id === id) || !Number.isFinite(Date.parse(now))) throw new Error("Action is not available for this room");
  const current = selectedSimpleActions(draft).map(t => t.id);
  return { ...draft, selectedTechniques: { ids: current.includes(id) ? current.filter(item => item !== id) : [...current, id], assessmentSignature: materialSignature(draft), recordedAt: now } };
}
