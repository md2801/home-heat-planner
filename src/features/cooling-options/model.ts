import type { Comparison, EstimateStatus, FinancialResult, Recommendation } from "../../domain/models.ts";
import { unknown } from "../../domain/unknown.ts";
import type { AssessmentDraft } from "../assessment/state.ts";
import { assessContributors, type Contributor } from "../heat-contributors/model.ts";
import { roomBaseline } from "../room-baseline/model.ts";

export const OPTIONS_VERSION = "qualitative-options-v1";
export type OptionId = NonNullable<AssessmentDraft["selectedOption"]>["actionId"];
export interface CoolingOption {
  id: OptionId;
  title: string;
  description: string;
  status: EstimateStatus;
  contributor: Contributor;
  recommendation: Recommendation;
  comparison: Comparison;
  budgetStatus: "cost-not-established";
  readiness: string;
}
const savingsGap = "No applicable action-specific energy-effect method has been established. A cooling baseline alone does not establish intervention savings.";
function unavailable(reason: string): FinancialResult {
  return { status: "insufficient-evidence", amountAud: unknown(reason), currency: "AUD", period: unknown("No supported annual comparison period"), methodVersion: OPTIONS_VERSION, inputProvenance: [], assumptions: [], sourceIds: [], limitations: [reason] };
}
export function optionSignature(draft: AssessmentDraft): string {
  return JSON.stringify(Object.fromEntries(Object.entries(draft.answers).sort(([a], [b]) => a.localeCompare(b))));
}
/** Eligibility is for investigation, never permission to install or predicted performance. */
export function coolingOptions(draft: AssessmentDraft) {
  const baseline = roomBaseline(draft);
  const contributors = assessContributors(draft);
  const permission = baseline.profile.externalChangesPermitted;
  const quotes = baseline.profile.willingToObtainQuotes;
  const gaps = [...contributors.gaps];
  const options: CoolingOption[] = [];
  for (const contributor of contributors.contributors) {
    if (contributor.id === "window-solar" && contributor.status !== "likely-contributor") {
      gaps.push("Confirm window direction, hot-time exposure and external shade before considering a shading option.");
      continue;
    }
    if (contributor.id === "window-solar" && permission.status === "known" && !permission.value) {
      gaps.push("External shading is excluded because you reported that external changes are restricted.");
      continue;
    }
    const id: OptionId = contributor.id === "window-solar" ? "external-shading" : contributor.id === "roof-ceiling" ? "ceiling-insulation" : "opening-review";
    const title = id === "external-shading" ? "External window shading" : id === "ceiling-insulation" ? "Ceiling insulation review" : "Window opening review";
    const checks = [...contributor.unknowns, ...(id === "external-shading" && permission.status === "unknown" ? ["External-change permission · Not sure"] : []), ...(id === "ceiling-insulation" ? ["Confirm ownership, access and any shared-building permissions before work. Do not enter a roof space yourself."] : []), "Installed cost and scope need a quote; no price is established."];
    const readiness = id === "external-shading" && permission.status === "unknown" ? "Check permission first" : quotes.status === "known" && !quotes.value ? "Review information first · quotes declined" : "Investigation first";
    const recommendation: Recommendation = { id, actionId: id, description: contributor.nextStep, eligibility: "eligible", requiredChecks: checks, factIds: contributor.reasons.filter(r => r.fact.status === "known").map(r => r.fieldId), sourceIds: contributor.sourceIds, comfortTradeOffs: id === "opening-review" ? ["Ventilation depends on cooler outdoor air and safe, suitable outdoor conditions. Keep reported noise, security and air-quality constraints in place."] : [], upfrontCostAud: unknown("No installed quote or sourced cost range"), costScope: unknown("Scope and inclusions not established"), catalogueVersion: OPTIONS_VERSION };
    options.push({ id, title, description: contributor.summary, status: "insufficient-evidence", contributor, recommendation, comparison: { optionId: id, baseline: baseline.result ?? unavailable("Cooling baseline inputs are incomplete"), proposed: unavailable(savingsGap), annualNetSavings: unavailable(savingsGap), simplePaybackYears: unknown("Both valid upfront cost and positive supported annual net savings are required"), assumptions: [] }, budgetStatus: "cost-not-established", readiness });
  }
  const saved = draft.selectedOption;
  const selected = saved && saved.assessmentSignature === optionSignature(draft) ? options.find(option => option.id === saved.actionId) ?? null : null;
  const journey = { ...baseline.journey, recommendations: options.map(o => o.recommendation), comparisons: options.map(o => o.comparison), selectedActionId: selected && saved ? { status: "known" as const, value: selected.id, provenance: { kind: "user-reported" as const, recordedAt: saved.recordedAt, sourceIds: [], scope: "Selected next investigation; not an installation or savings guarantee" } } : unknown("No current eligible option selected") };
  return { options, baseline, gaps: [...new Set(gaps)], selected, journey };
}
export function selectCoolingOption(draft: AssessmentDraft, id: OptionId, recordedAt: string): AssessmentDraft {
  if (!coolingOptions(draft).options.some(option => option.id === id) || !Number.isFinite(Date.parse(recordedAt))) throw new Error("Option is not eligible for investigation");
  return { ...draft, selectedOption: { actionId: id, assessmentSignature: optionSignature(draft), recordedAt } };
}
export function coolingOptionsDestination(draft: AssessmentDraft): "/cooling-plan" | null {
  return coolingOptions(draft).selected ? "/cooling-plan" : null;
}
export function refineBudget(draft: AssessmentDraft): AssessmentDraft {
  return { ...draft, currentQuestionId: "budgetAud", completed: false };
}
