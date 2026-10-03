import type { OptionId } from "../features/cooling-options/model.ts";

export const RESEARCH_DOMAINS = ["yourhome.gov.au", "energy.gov.au", "energyrating.gov.au"] as const;
export const RESEARCH_UI_VERSION = 2;
export const RESEARCH_COPY_LIMITS = {
  headline: { characters: 52, words: 7 },
  whyForRoom: { characters: 120, words: 20 },
  potentialBenefit: { characters: 100, words: 17 },
  actionLabel: { characters: 56, words: 9 },
  actionDetail: { characters: 130, words: 23 },
  check: { characters: 90, words: 16 },
} as const;
export interface ResearchSuggestion {
  component: "improvement-card";
  optionId: OptionId;
  headline: string;
  whyForRoom: string;
  potentialBenefit: string;
  nextAction: { label: string; detail: string };
  checks: string[];
  sources: { url: string; title: string }[];
}
export type CoolingResearchResult = { ok: true; schemaVersion: typeof RESEARCH_UI_VERSION; retrievedAt: string; suggestions: ResearchSuggestion[] } | { ok: false; message: string };
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
export function validResearchResult(value: unknown, allowed: readonly OptionId[]): value is Extract<CoolingResearchResult, { ok: true }> {
  const data = record(value);
  if (Object.keys(data).some(key => !["ok", "schemaVersion", "retrievedAt", "suggestions"].includes(key)) || data.ok !== true || data.schemaVersion !== RESEARCH_UI_VERSION || typeof data.retrievedAt !== "string" || !Number.isFinite(Date.parse(data.retrievedAt)) || !Array.isArray(data.suggestions) || data.suggestions.length < 1 || data.suggestions.length > 4) return false;
  const ids = new Set<string>();
  return data.suggestions.every(value => {
    const item = record(value);
    const action = record(item.nextAction);
    if (Object.keys(item).some(key => !["component", "optionId", "headline", "whyForRoom", "potentialBenefit", "nextAction", "checks", "sources"].includes(key)) || item.component !== "improvement-card" || typeof item.optionId !== "string" || !allowed.includes(item.optionId as OptionId) || ids.has(item.optionId) || !cardCopy(item.headline, "headline") || !cardCopy(item.whyForRoom, "whyForRoom") || !cardCopy(item.potentialBenefit, "potentialBenefit") || !/\b(?:may|could)\b/i.test(item.potentialBenefit) || Object.keys(action).some(key => !["label", "detail"].includes(key)) || !cardCopy(action.label, "actionLabel") || !cardCopy(action.detail, "actionDetail") || !Array.isArray(item.checks) || item.checks.length < 1 || item.checks.length > 2 || !item.checks.every(check => cardCopy(check, "check")) || new Set(item.checks).size !== item.checks.length || !Array.isArray(item.sources) || item.sources.length < 1 || item.sources.length > 3) return false;
    ids.add(item.optionId);
    const urls = new Set<string>();
    return item.sources.every(value => {
      const source = record(value), url = trustedResearchUrl(source.url);
      if (Object.keys(source).some(key => !["url", "title"].includes(key)) || !url || urls.has(url) || typeof source.title !== "string" || !source.title.trim() || source.title.length > 200) return false;
      urls.add(url); return true;
    });
  });
}

/** A closed component vocabulary: the model supplies content, never markup or controls. */
export function researchResponseFormat(allowed: readonly OptionId[]) {
  const text = (field: keyof typeof RESEARCH_COPY_LIMITS) => ({ type: "string", minLength: 1, maxLength: RESEARCH_COPY_LIMITS[field].characters });
  return { type: "json_schema", name: "cooling_research_ui_v2", strict: true, schema: {
    type: "object", additionalProperties: false,
    properties: {
      schemaVersion: { type: "integer", enum: [RESEARCH_UI_VERSION] },
      suggestions: { type: "array", maxItems: 4, items: {
        type: "object", additionalProperties: false,
        properties: {
          component: { type: "string", enum: ["improvement-card"] }, optionId: { type: "string", enum: allowed },
          headline: text("headline"), whyForRoom: text("whyForRoom"), potentialBenefit: text("potentialBenefit"),
          nextAction: { type: "object", additionalProperties: false, properties: { label: text("actionLabel"), detail: text("actionDetail") }, required: ["label", "detail"] },
          checks: { type: "array", minItems: 1, maxItems: 2, items: text("check") },
          sourceUrls: { type: "array", minItems: 1, maxItems: 3, items: { type: "string" } },
        }, required: ["component", "optionId", "headline", "whyForRoom", "potentialBenefit", "nextAction", "checks", "sourceUrls"],
      } },
    }, required: ["schemaVersion", "suggestions"],
  } };
}
