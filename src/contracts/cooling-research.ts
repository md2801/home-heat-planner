import type { OptionId } from "../features/cooling-options/model.ts";
import { optionTechniqueIds, type ResourceIds } from "../features/knowledge-base/recommendation-resources.ts";
import { equipmentCopyAllowed, hasReportedAC } from "../features/cooling-options/recommendation-policy.ts";

export const RESEARCH_DOMAINS = ["yourhome.gov.au", "energy.gov.au", "energyrating.gov.au"] as const;
export const RESEARCH_UI_VERSION = 4;
export const RESEARCH_COPY_LIMITS = {
  headline: { characters: 52, words: 7 },
  whyForRoom: { characters: 120, words: 20 },
  potentialBenefit: { characters: 100, words: 17 },
  actionLabel: { characters: 56, words: 9 },
  actionDetail: { characters: 130, words: 23 },
  check: { characters: 90, words: 16 },
} as const;
export interface ResearchCardCopy {
  headline: string;
  whyForRoom: string;
  potentialBenefit: string;
  nextAction: { label: string; detail: string };
  checks: string[];
  sources: { url: string; title: string }[];
}
export interface ResearchSuggestion extends ResearchCardCopy {
  component: "improvement-card";
  optionId: OptionId;
  techniqueIds: string[];
}
export interface ResearchTechnique extends ResearchCardCopy {
  component: "technique-card";
  techniqueId: string;
}
export interface ResearchConstraints {
  coolingEquipment: readonly string[] | null;
  techniqueIds: readonly string[];
}
export const noEquipmentConstraints: ResearchConstraints = { coolingEquipment: null, techniqueIds: [] };
export type CoolingResearchResult = { ok: true; schemaVersion: typeof RESEARCH_UI_VERSION; retrievedAt: string; suggestions: ResearchSuggestion[]; techniques: ResearchTechnique[] } | { ok: false; message: string };
export const record = (value: unknown): Record<string, unknown> => value !== null && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
export function trustedResearchUrl(value: unknown): string | null {
  if (typeof value !== "string" || value.length > 2000) return null;
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" || url.username || url.password || url.port || !RESEARCH_DOMAINS.some(domain => url.hostname === domain || url.hostname.endsWith(`.${domain}`))) return null;
    url.hash = "";
    return url.href;
  } catch { return null; }
}
/** This feature returns qualitative guidance, never numerical comparison inputs. */
export function qualitativeText(value: unknown, max: number): value is string {
  return typeof value === "string" && value.trim().length > 0 && value.length <= max && !/[\p{N}$%£€\r\n]|https?:|www\.|<|>/u.test(value);
}
function cardCopy(value: unknown, field: keyof typeof RESEARCH_COPY_LIMITS): value is string {
  const limit = RESEARCH_COPY_LIMITS[field];
  return qualitativeText(value, limit.characters) && value.trim().split(/\s+/).length <= limit.words;
}
/** Diagnostic codes only: never expose generated copy or room data in logs. */
export function researchCopyIssue(item: Record<string, unknown>, constraints: ResearchConstraints): string | null {
  const action = record(item.nextAction);
  for (const [field, value] of [["headline", item.headline], ["whyForRoom", item.whyForRoom], ["potentialBenefit", item.potentialBenefit], ["actionLabel", action.label], ["actionDetail", action.detail]] as const) {
    if (!cardCopy(value, field)) return `${field}-limits`;
    if (!equipmentCopyAllowed(value, constraints.coolingEquipment)) return "unreported-equipment";
  }
  if (typeof item.potentialBenefit !== "string" || !/\b(?:may|could)\b/i.test(item.potentialBenefit)) return "benefit-certainty";
  if (!Array.isArray(item.checks) || !item.checks.every(check => cardCopy(check, "check"))) return "check-limits";
  if (!item.checks.every(check => equipmentCopyAllowed(check, constraints.coolingEquipment))) return "unreported-equipment";
  if (Array.isArray(item.sources) && !item.sources.every(value => { const source = record(value); return typeof source.title === "string" && equipmentCopyAllowed(source.title, constraints.coolingEquipment); })) return "source-equipment";
  return null;
}
function validCard(item: Record<string, unknown>, constraints: ResearchConstraints): boolean {
  const action = record(item.nextAction);
  if (researchCopyIssue(item, constraints) || Object.keys(action).some(key => !["label", "detail"].includes(key)) || !Array.isArray(item.checks) || item.checks.length < 1 || item.checks.length > 2 || new Set(item.checks).size !== item.checks.length || !Array.isArray(item.sources) || item.sources.length < 1 || item.sources.length > 3) return false;
  const urls = new Set<string>();
  return item.sources.every(value => {
    const source = record(value), url = trustedResearchUrl(source.url);
    if (Object.keys(source).some(key => !["url", "title"].includes(key)) || !url || urls.has(url) || typeof source.title !== "string" || !source.title.trim() || source.title.length > 200 || !equipmentCopyAllowed(source.title, constraints.coolingEquipment)) return false;
    urls.add(url); return true;
  });
}
export function validResearchResult(value: unknown, allowed: readonly OptionId[], resourceIds: ResourceIds = optionTechniqueIds, constraints: ResearchConstraints = noEquipmentConstraints): value is Extract<CoolingResearchResult, { ok: true }> {
  const data = record(value);
  if (Object.keys(data).some(key => !["ok", "schemaVersion", "retrievedAt", "suggestions", "techniques"].includes(key)) || data.ok !== true || data.schemaVersion !== RESEARCH_UI_VERSION || typeof data.retrievedAt !== "string" || !Number.isFinite(Date.parse(data.retrievedAt)) || !Array.isArray(data.suggestions) || data.suggestions.length > 4 || !Array.isArray(data.techniques) || data.techniques.length > 4 || !data.suggestions.length && !data.techniques.length) return false;
  const ids = new Set<string>();
  const validSuggestions = data.suggestions.every(value => {
    const item = record(value);
    if (Object.keys(item).some(key => !["component", "optionId", "headline", "whyForRoom", "potentialBenefit", "nextAction", "checks", "sources", "techniqueIds"].includes(key)) || item.component !== "improvement-card" || typeof item.optionId !== "string" || !allowed.includes(item.optionId as OptionId) || ids.has(item.optionId) || item.optionId === "ac-replacement" && !hasReportedAC(constraints.coolingEquipment) || !validCard(item, constraints)) return false;
    if (!Array.isArray(item.techniqueIds) || item.techniqueIds.length > 3 || new Set(item.techniqueIds).size !== item.techniqueIds.length || !item.techniqueIds.every(id => typeof id === "string" && optionTechniqueIds[item.optionId as OptionId].includes(id) && resourceIds[item.optionId as OptionId]?.includes(id))) return false;
    ids.add(item.optionId);
    return true;
  });
  return validSuggestions && data.techniques.every(value => {
    const item = record(value);
    if (Object.keys(item).some(key => !["component", "techniqueId", "headline", "whyForRoom", "potentialBenefit", "nextAction", "checks", "sources"].includes(key)) || item.component !== "technique-card" || typeof item.techniqueId !== "string" || !constraints.techniqueIds.includes(item.techniqueId) || ids.has(item.techniqueId) || !validCard(item, constraints)) return false;
    ids.add(item.techniqueId); return true;
  });
}

/** A closed component vocabulary: the model supplies content, never markup or controls. */
export function researchResponseFormat(allowed: readonly OptionId[], resourceIds: ResourceIds = optionTechniqueIds, constraints: ResearchConstraints = noEquipmentConstraints, retrievedSourceUrls: readonly string[] = []) {
  const text = (field: keyof typeof RESEARCH_COPY_LIMITS) => ({ type: "string", minLength: 1, maxLength: RESEARCH_COPY_LIMITS[field].characters, description: `One short line, at most ${RESEARCH_COPY_LIMITS[field].words} words. No figures, markup or equipment the user did not report.` });
  const techniqueIds = [...new Set(allowed.flatMap(id => resourceIds[id] ?? []))];
  const copy = {
    headline: text("headline"), whyForRoom: text("whyForRoom"), potentialBenefit: { ...text("potentialBenefit"), pattern: "^(May|Could) .+$", description: "Start with May or Could, followed by a possible qualitative benefit. No guarantee or numerical prediction. At most seventeen words." },
    nextAction: { type: "object", additionalProperties: false, properties: { label: text("actionLabel"), detail: text("actionDetail") }, required: ["label", "detail"] },
    checks: { type: "array", minItems: 1, maxItems: 2, items: text("check") },
    sourceUrls: { type: "array", minItems: 1, maxItems: 3, items: retrievedSourceUrls.length ? { type: "string", enum: retrievedSourceUrls } : { type: "string" } },
  };
  return { type: "json_schema", name: "cooling_research_ui_v4", strict: true, schema: {
    type: "object", additionalProperties: false,
    properties: {
      schemaVersion: { type: "integer", enum: [RESEARCH_UI_VERSION] },
      suggestions: { type: "array", maxItems: Math.min(4, allowed.length), items: {
        type: "object", additionalProperties: false,
        properties: {
          component: { type: "string", enum: ["improvement-card"] }, optionId: allowed.length ? { type: "string", enum: allowed } : { type: "string" },
          ...copy,
          techniqueIds: { type: "array", maxItems: techniqueIds.length ? 3 : 0, items: techniqueIds.length ? { type: "string", enum: techniqueIds } : { type: "string" } },
        }, required: ["component", "optionId", "headline", "whyForRoom", "potentialBenefit", "nextAction", "checks", "sourceUrls", "techniqueIds"],
      } },
      techniques: { type: "array", maxItems: Math.min(4, constraints.techniqueIds.length), items: {
        type: "object", additionalProperties: false,
        properties: { component: { type: "string", enum: ["technique-card"] }, techniqueId: constraints.techniqueIds.length ? { type: "string", enum: constraints.techniqueIds } : { type: "string" }, ...copy },
        required: ["component", "techniqueId", ...Object.keys(copy)],
      } },
    }, required: ["schemaVersion", "suggestions", "techniques"],
  } };
}
