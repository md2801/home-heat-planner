import { billFields, isBill, MAX_BILL_TEXT, type ConfirmedBill } from "./energy-assistant.ts";

export type EnergyAdvice = {
  summary: string;
  billNotes: { title: string; explanation: string; evidence: string }[];
  recommendations: { title: string; reason: string; action: string; check: string; techniqueId: string | null }[];
  uncertainties: string[];
};
export type EnergyAnalysisInput = { billText: string; confirmed: ConfirmedBill; household: Record<string, string> };
export type EnergyAnalysisResponse = { ok: true; advice: EnergyAdvice } | { ok: false; message: string };
const object = (value: unknown): value is Record<string, unknown> => !!value && typeof value === "object" && !Array.isArray(value);
const text = (value: unknown, max: number): value is string => typeof value === "string" && !!value.trim() && value.length <= max;
const householdKeys = ["occupancy", "loads", "cooling", "hotWater", "dryer", "pool", "ev", "refrigeration", "solar", "routine", "priority"];

export function isEnergyAnalysisInput(value: unknown): value is EnergyAnalysisInput {
  if (!object(value) || Object.keys(value).length !== 3 || !text(value.billText, MAX_BILL_TEXT) || !object(value.confirmed) || !object(value.household)) return false;
  const confirmed = value.confirmed;
  return Object.keys(confirmed).length === 3 && confirmed.confirmed === true && isBill(confirmed.bill) && Array.isArray(confirmed.correctedFields) && confirmed.correctedFields.length <= Object.keys(billFields).length && confirmed.correctedFields.every(key => typeof key === "string" && key in billFields) && Object.entries(value.household).every(([key, answer]) => householdKeys.includes(key) && text(answer, 1000));
}

export function isEnergyAdvice(value: unknown): value is EnergyAdvice {
  return object(value) && Object.keys(value).length === 4 && text(value.summary, 800)
    && Array.isArray(value.billNotes) && value.billNotes.length <= 6 && value.billNotes.every(note => object(note) && Object.keys(note).length === 3 && text(note.title, 100) && text(note.explanation, 600) && text(note.evidence, 240))
    && Array.isArray(value.recommendations) && value.recommendations.length <= 3 && value.recommendations.every(item => object(item) && Object.keys(item).length === 5 && text(item.title, 100) && text(item.reason, 500) && text(item.action, 600) && text(item.check, 400) && (item.techniqueId === null || text(item.techniqueId, 80)))
    && Array.isArray(value.uncertainties) && value.uncertainties.length <= 4 && value.uncertainties.every(item => text(item, 400));
}

export function energyAdviceSchema(techniqueIds: string[]) {
  const string = { type: "string" };
  return {
    type: "object", additionalProperties: false,
    properties: {
      summary: string,
      billNotes: { type: "array", maxItems: 6, items: { type: "object", additionalProperties: false, properties: { title: string, explanation: string, evidence: string }, required: ["title", "explanation", "evidence"] } },
      recommendations: { type: "array", maxItems: 3, items: { type: "object", additionalProperties: false, properties: { title: string, reason: string, action: string, check: string, techniqueId: { type: ["string", "null"], enum: [...techniqueIds, null] } }, required: ["title", "reason", "action", "check", "techniqueId"] } },
      uncertainties: { type: "array", maxItems: 4, items: string },
    },
    required: ["summary", "billNotes", "recommendations", "uncertainties"],
  };
}
