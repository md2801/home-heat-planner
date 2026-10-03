import type { AssessmentDraft } from "../assessment/state.ts";
import { coolingResearchContext } from "../cooling-options/research-context.ts";
import { recommendationResources } from "../knowledge-base/recommendation-resources.ts";
import { techniques, type Technique } from "../knowledge-base/catalogue.ts";

export interface HeatwaveAction {
  technique: Technique;
  title: string;
  steps: readonly string[];
}
export interface HeatwaveGroup {
  id: "before" | "peak" | "cooler";
  title: string;
  actions: HeatwaveAction[];
}

/** Read-only guidance from the reviewed catalogue. Never changes the selected plan,
 * checklist, financial snapshot or room facts, and never calls a provider. */
export function heatwaveReady(draft: AssessmentDraft) {
  const context = coolingResearchContext(draft);
  const eligible = new Set(recommendationResources(context).techniqueIds);
  // This is a generally applicable reviewed starting point, not an inferred room fact.
  eligible.add("reduce-indoor-heat");
  const actions = (ids: readonly string[]): HeatwaveAction[] => ids.flatMap(id => {
    const technique = techniques.find(item => item.id === id);
    if (!technique || !eligible.has(id)) return [];
    // Preparing for a hot day is an observation, not a suggestion to install shade now.
    return [{ technique, title: id === "external-shade" ? "Identify sun-exposed windows" : technique.title,
      steps: id === "external-shade" ? technique.steps.slice(0, 1) : technique.steps }];
  });
  const limits = draft.answers.ventilationConstraints;
  // Free-text constraints cannot safely be interpreted as permission to ventilate.
  // Only an explicit no-limits answer admits this conditional guide.
  const noLimits = limits?.status === "known" && limits.provenance.kind === "user-reported" && typeof limits.value === "string"
    && /^(no (known )?(limits|constraints|issues|problems|restrictions)|none|not applicable)[.!]?$/i.test(limits.value.trim());
  const canVentilate = eligible.has("cooler-air") && noLimits;
  const groups: HeatwaveGroup[] = [
    { id: "before", title: "Before the hot day", actions: actions(["close-curtains", "external-shade", "clean-filters"]) },
    { id: "peak", title: "During peak heat", actions: actions(["reduce-indoor-heat", "fans", "comfortable-setting", "cool-used-rooms"]).slice(0, 3) },
    { id: "cooler", title: "When it’s cooler outside", actions: canVentilate ? actions(["cooler-air"]) : [] },
  ];
  return {
    groups: groups.filter(group => group.actions.length > 0),
    ventilationNote: canVentilate ? null : "Window-opening advice is omitted because opening ability or practical constraints are unknown or limiting. Review your room answers before considering ventilation.",
  };
}
