import type { AssessmentDraft } from "../assessment/state.ts";
import { coolingOptions } from "./model.ts";
import { financialSummary, financialText } from "./financial-summary.ts";
export const briefFocuses = ["understand", "budget", "next-step"] as const;
export type BriefFocus = typeof briefFocuses[number];
export interface BriefCard { id: string; title: string; text: string; checks: string[]; href: string; link: string }
/** Only calculator-owned facts and reviewed explanations can reach the visible brief. */
export function financialBrief(draft: AssessmentDraft): BriefCard[] {
  const view = coolingOptions(draft);
  const baseline = view.baseline;
  const cards: BriefCard[] = [{ id: "baseline", title: "What your cooling costs today", text: baseline.result?.amountAud.status === "known" ? `${financialText(baseline.result.amountAud)} over ${baseline.periodLabel}. ${baseline.kind === "scenario" ? "This is a what-if usage scenario, not measured spending." : "Based on the cooling energy and scope you confirmed."} This amount alone does not establish improvement savings.` : "Your current cooling cost cannot be calculated yet. A whole-home bill alone does not establish bedroom cooling spending.", checks: baseline.missing.slice(0, 3), href: "/room-baseline", link: "Review baseline inputs" }];
  for (const option of view.options) {
    const summary = financialSummary(option.comparison, option.recommendation.upfrontCostAud);
    if (option.shadingScenario) {
      const result = option.shadingScenario;
      cards.push({ id: option.id, title: "Your shading cost scenario", text: `Under the reviewed assumptions: ${financialText(option.comparison.baseline.amountAud)} before and ${financialText(option.comparison.proposed.amountAud)} with shade. Difference: ${summary.savings}. Period: ${result.periodLabel}. This uses synthetic weather and an uncalibrated room model, not your measured bill. The same cooling schedule and temperature target are used, but comfort is not guaranteed. Upfront: ${summary.cost}. Annual savings and payback are not established.`, checks: option.recommendation.requiredChecks.slice(0, 3), href: "#shading-savings", link: "Review shading assumptions" });
      continue;
    }
    cards.push({ id: option.id, title: option.title, text: `Upfront: ${summary.cost}. Net savings: ${summary.savings}. Simple payback: ${summary.payback}. ${option.id === "ac-replacement" ? "These are standard annual energy-label comparisons, not predicted savings in your home." : "A quote establishes price, but does not establish energy savings. An applicable intervention-effect method is still needed."} ${option.budgetStatus === "above-budget" ? "The quoted cost exceeds your reported budget." : option.budgetStatus === "within-budget" ? "The quoted cost fits your reported budget; that does not by itself establish value for money." : "Budget fit remains unknown."} ${summary.reason}`, checks: option.recommendation.requiredChecks.slice(0, 3), href: option.id === "ac-replacement" ? "#ac-cost-comparison" : `#research-${option.id}`, link: option.id === "ac-replacement" ? "Review labels and quote" : "Review this option and its evidence" });
  }
  cards.push({ id: "sensitivity", title: "What would change the financial result?", text: "For a comparable AC label calculation, changing the tariff changes the electricity-cost difference. A different installed quote changes upfront cost and payback. Higher recurring costs reduce net savings. Zero or negative net savings do not produce a positive payback. These relationships do not establish savings from shading or insulation.", checks: [], href: view.options.some(o => o.id === "ac-replacement") ? "#ac-cost-comparison" : "/assessment", link: "Review financial inputs" });
  return cards;
}
export function validBriefSelection(value: unknown, cards: BriefCard[]): value is { ids: string[] } {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const v = value as { ids?: unknown };
  return Object.keys(value).length === 1 && Array.isArray(v.ids) && v.ids.length >= 1 && v.ids.length <= 3 && new Set(v.ids).size === v.ids.length && v.ids.every(id => typeof id === "string" && cards.some(card => card.id === id));
}
