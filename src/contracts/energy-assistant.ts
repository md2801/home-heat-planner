export const MAX_PDF_BYTES = 4 * 1024 * 1024;
export const MAX_PDF_PAGES = 12;
export const MAX_BILL_TEXT = 48000;
export const MEMORY_LIMIT = 10;
export const billFields = {
  provider: { label: "Electricity retailer", type: "string", unit: "" },
  periodStart: { label: "Period starts", type: "date", unit: "" },
  periodEnd: { label: "Period ends", type: "date", unit: "" },
  billingDays: { label: "Billing days", type: "number", unit: "days" },
  consumptionKwh: { label: "Electricity imported", type: "number", unit: "kWh" },
  totalAmountAud: { label: "Current bill total", type: "number", unit: "AUD" },
  usageRateAud: { label: "Single usage rate", type: "number", unit: "AUD/kWh" },
  supplyDailyAud: { label: "Daily supply charge", type: "number", unit: "AUD/day" },
  tariffType: { label: "Tariff stated on bill", type: "string", unit: "" },
  solarExportKwh: { label: "Solar exported", type: "number", unit: "kWh" },
  feedInCreditAud: { label: "Feed-in credit", type: "number", unit: "AUD credit" },
  otherCharges: { label: "Other charges / rate details", type: "string", unit: "" },
} as const;
export type BillKey = keyof typeof billFields;
export type TariffComponent = { kind: "peak" | "shoulder" | "off-peak" | "controlled-load" | "anytime" | "solar-feed-in" | "other"; label: string; rateAudPerKwh: number | null; consumptionKwh: number | null; amountAud: number | null; evidence: string };
export type Bill = { [K in BillKey]: { value: (typeof billFields)[K]["type"] extends "number" ? number | null : string | null; evidence: string | null } } & { tariffComponents?: TariffComponent[]; consumptionCalculation?: { method: "sum-import-rows"; componentIndexes: number[] } };
export type ConfirmedBill = { bill: Bill; correctedFields: BillKey[]; confirmed: true };
export type ChatMessage = { role: "user" | "assistant"; content: string };
export type ChatRequest = { mode: "general"; messages: ChatMessage[] };
export type BillResponse = { ok: true; bill: Bill; billText: string } | { ok: false; message: string };
export type ChatResponse = { ok: true; answer: string } | { ok: false; message: string };
const object = (v: unknown): v is Record<string, unknown> => !!v && typeof v === "object" && !Array.isArray(v);
export function validDate(v: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(v) && Number.isFinite(Date.parse(v)) && new Date(v).toISOString().slice(0, 10) === v;
}
export function emptyBill(): Bill {
  return Object.fromEntries(Object.keys(billFields).map(k => [k, { value: null, evidence: null }])) as unknown as Bill;
}
export function isBill(v: unknown): v is Bill {
  if (!object(v) || Object.keys(v).some(k => !(k in billFields) && k !== "tariffComponents" && k !== "consumptionCalculation") || Object.keys(billFields).some(k => !(k in v))) return false;
  const fieldsValid = (Object.keys(billFields) as BillKey[]).every(k => {
    const f = v[k]; if (!object(f) || Object.keys(f).length !== 2 || !("value" in f) || !("evidence" in f)) return false;
    if (f.evidence !== null && (typeof f.evidence !== "string" || !f.evidence.trim() || f.evidence.length > 240)) return false;
    if (f.value === null) return f.evidence === null;
    if (billFields[k].type === "number") return typeof f.value === "number" && Number.isFinite(f.value) && Math.abs(f.value) <= 10000000 && (k === "totalAmountAud" || f.value >= 0) && (k !== "billingDays" || (Number.isInteger(f.value) && f.value > 0 && f.value <= 730));
    return typeof f.value === "string" && !!f.value.trim() && f.value.length <= 600 && (billFields[k].type !== "date" || validDate(f.value));
  });
  if (!fieldsValid || (v.tariffComponents !== undefined && (!Array.isArray(v.tariffComponents) || v.tariffComponents.length > 12 || !v.tariffComponents.every(isTariffComponent)))) return false;
  if (v.consumptionCalculation !== undefined) {
    const calculation = v.consumptionCalculation, sum = sumImportedTariffs((v.tariffComponents ?? []) as TariffComponent[]);
    if (!object(calculation) || Object.keys(calculation).length !== 2 || calculation.method !== "sum-import-rows" || !Array.isArray(calculation.componentIndexes) || !sum || calculation.componentIndexes.length !== sum.componentIndexes.length || !calculation.componentIndexes.every((index, i) => index === sum.componentIndexes[i]) || (v.consumptionKwh as Bill["consumptionKwh"]).value !== sum.total || (v.consumptionKwh as Bill["consumptionKwh"]).evidence !== null) return false;
  }
  const start = (v.periodStart as Bill["periodStart"]).value, end = (v.periodEnd as Bill["periodEnd"]).value;
  return !start || !end || start <= end;
}
export function isChatRequest(v: unknown): v is ChatRequest {
  return object(v) && Object.keys(v).length === 2 && v.mode === "general" && Array.isArray(v.messages) && v.messages.length > 0 && v.messages.length <= MEMORY_LIMIT && v.messages.every(m => object(m) && Object.keys(m).length === 2 && ["user", "assistant"].includes(String(m.role)) && typeof m.content === "string" && m.content.trim().length > 0 && m.content.length <= 3000) && v.messages.at(-1)?.role === "user";
}
export function validatePdfFile(file: { name: string; type: string; size: number }): string | null {
  if (!/\.pdf$/i.test(file.name) || !["application/pdf", ""].includes(file.type)) return "Choose an electricity bill in PDF format.";
  if (file.size <= 0) return "This file is empty. Choose another PDF.";
  if (file.size > MAX_PDF_BYTES) return "Choose a PDF smaller than 4 MB.";
  return null;
}
const tariffKinds = ["peak", "shoulder", "off-peak", "controlled-load", "anytime", "solar-feed-in", "other"];
function isTariffComponent(v: unknown): v is TariffComponent {
  return object(v) && Object.keys(v).length === 6 && tariffKinds.includes(String(v.kind)) && typeof v.label === "string" && !!v.label.trim() && v.label.length <= 120 && typeof v.evidence === "string" && !!v.evidence.trim() && v.evidence.length <= 240 && ["rateAudPerKwh", "consumptionKwh", "amountAud"].every(k => v[k] === null || (typeof v[k] === "number" && Number.isFinite(v[k]) && Math.abs(v[k]) <= 10000000 && (k === "amountAud" || v[k] >= 0)));
}
/** Sum a complete set of distinct import rows. The caller must first establish coverage and source evidence. */
export function sumImportedTariffs(components: TariffComponent[]): { total: number; componentIndexes: number[] } | null {
  const rows = components.map((row, index) => ({ ...row, index })).filter(row => row.kind !== "solar-feed-in");
  if (!rows.length || rows.some(row => row.kind === "other" || row.consumptionKwh === null || !Number.isFinite(row.consumptionKwh) || row.consumptionKwh < 0 || (row.amountAud !== null && row.amountAud < 0))) return null;
  // Repeated categories can be overlapping periods, tiered rates or duplicate table readings.
  if (new Set(rows.map(row => row.kind)).size !== rows.length) return null;
  if (rows.some(row => row.kind === "anytime") && rows.some(row => ["peak", "off-peak", "shoulder"].includes(row.kind))) return null;
  const excerpts = rows.map(row => row.evidence.replace(/\s+/g, " ").trim().toLowerCase());
  if (excerpts.some((excerpt, index) => !excerpt || excerpts.some((other, i) => i !== index && other.includes(excerpt)))) return null;
  const total = Number(rows.reduce((sum, row) => sum + row.consumptionKwh!, 0).toFixed(6));
  return Number.isFinite(total) && total <= 10000000 ? { total, componentIndexes: rows.map(row => row.index) } : null;
}
export function hasCoreBill(bill: Bill): boolean {
  if (bill.consumptionKwh.value === null) return false;
  if (bill.billingDays.value !== null) return true;
  const start = bill.periodStart.value, end = bill.periodEnd.value;
  return !!start && !!end && validDate(start) && validDate(end) && start <= end && (Date.parse(end) - Date.parse(start)) / 86400000 < 730;
}
const rateKeys = ["usageRateAud", "supplyDailyAud"] as const;
export function normalizeExtractedRates(value: unknown): unknown {
  if (!object(value)) return value;
  const result = structuredClone(value);
  for (const key of rateKeys) {
    const field = result[key];
    if (!object(field) || Object.keys(field).length !== 3 || !("value" in field) || !("evidence" in field) || !("unit" in field)) throw new Error("Invalid extracted rate");
    if (field.value === null) { if (field.unit !== null) throw new Error("Unknown rate unit"); }
    else {
      if (typeof field.value !== "number" || !["AUD", "cents"].includes(String(field.unit))) throw new Error("Unknown rate unit");
      if (field.unit === "cents") field.value /= 100;
    }
    delete field.unit;
  }
  if (result.tariffComponents !== undefined) {
    if (!Array.isArray(result.tariffComponents) || result.tariffComponents.length > 12) throw new Error("Invalid tariff components");
    result.tariffComponents = result.tariffComponents.map(component => {
      if (!object(component) || Object.keys(component).length !== 7 || !("rateUnit" in component)) throw new Error("Invalid tariff component");
      const next = { ...component };
      if (next.rateAudPerKwh === null) { if (next.rateUnit !== null) throw new Error("Unknown rate unit"); }
      else {
        if (typeof next.rateAudPerKwh !== "number" || !["AUD", "cents"].includes(String(next.rateUnit))) throw new Error("Unknown rate unit");
        if (next.rateUnit === "cents") next.rateAudPerKwh /= 100;
      }
      delete next.rateUnit; return next;
    });
  }
  return result;
}
export const billSchema = {
  type: "object", additionalProperties: false,
  properties: { importRowsComplete: { type: "boolean" }, ...Object.fromEntries(Object.entries(billFields).map(([key, field]) => {
    const rate = rateKeys.some(k => k === key);
    return [key, { type: "object", additionalProperties: false, properties: { value: { type: [field.type === "number" ? "number" : "string", "null"] }, evidence: { type: ["string", "null"] }, ...(rate ? { unit: { type: ["string", "null"], enum: ["AUD", "cents", null] } } : {}) }, required: ["value", "evidence", ...(rate ? ["unit"] : [])] }];
  })), tariffComponents: { type: "array", maxItems: 12, items: { type: "object", additionalProperties: false, properties: {
    kind: { type: "string", enum: tariffKinds }, label: { type: "string" },
    rateAudPerKwh: { type: ["number", "null"] }, rateUnit: { type: ["string", "null"], enum: ["AUD", "cents", null] },
    consumptionKwh: { type: ["number", "null"] }, amountAud: { type: ["number", "null"] }, evidence: { type: "string" },
  }, required: ["kind", "label", "rateAudPerKwh", "rateUnit", "consumptionKwh", "amountAud", "evidence"] } } }, required: [...Object.keys(billFields), "tariffComponents", "importRowsComplete"],
};
