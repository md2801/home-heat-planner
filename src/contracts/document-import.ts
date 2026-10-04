import { billFields, validDate, type BillKey } from "./energy-assistant.ts";
import { replacementFields, type ReplacementField } from "../features/cooling-options/replacement.ts";

export const DOCUMENT_MAX_BYTES = 4 * 1024 * 1024;
export const DOCUMENT_MAX_PAGES = 12;
export const DOCUMENT_MAX_TEXT = 48000;
export const documentKinds = ["electricity-bill", "ac-label", "installation-quote"] as const;
export type DocumentKind = typeof documentKinds[number];
export type AcRole = "existing" | "proposed";
export type DocumentField = Extract<BillKey, "usageRateAud" | "periodStart" | "periodEnd" | "tariffType"> |
  Extract<ReplacementField, "existingModel" | "proposedModel" | "existingKwh" | "proposedKwh" | "installedCost" | "quoteScope" | "quoteDate" | "proposedRecurring"> | "currency";
/** Raw printed values, not canonical calculator inputs. No conversion or annualisation here. */
export interface ProposedDocumentField {
  field: DocumentField;
  value: string | number | null;
  unit: string | null;
  sourcePage: number | null;
  sourceExcerpt: string | null;
  needsConfirmation: true;
  calculationBasis: string | null;
}
export interface DocumentImportResult {
  schemaVersion: 1;
  documentKind: DocumentKind;
  acRole: AcRole;
  pageCount: number;
  evidenceMode: "pdf-text" | "visual";
  fields: ProposedDocumentField[];
}
export type DocumentImportResponse = { ok: true; result: DocumentImportResult } | { ok: false; message: string };
export const billImportFields = ["usageRateAud", "periodStart", "periodEnd", "tariffType"] as const satisfies readonly DocumentField[];
export const quoteImportFields = ["installedCost", "currency", "quoteScope", "quoteDate", "proposedRecurring"] as const satisfies readonly DocumentField[];
export function fieldsForDocument(kind: DocumentKind, role: AcRole): readonly DocumentField[] {
  return kind === "electricity-bill" ? billImportFields : kind === "installation-quote" ? quoteImportFields : role === "existing" ? ["existingModel", "existingKwh"] : ["proposedModel", "proposedKwh"];
}
export function documentFieldLabel(field: DocumentField): string {
  if (field === "currency") return "Printed currency";
  if (field in billFields) return billFields[field as BillKey].label;
  return replacementFields.find(item => item[0] === field)![1];
}
export function isNumericDocumentField(field: DocumentField): boolean {
  return ["usageRateAud", "existingKwh", "proposedKwh", "installedCost", "proposedRecurring"].includes(field);
}
export function documentUnits(field: DocumentField): readonly string[] {
  if (field === "usageRateAud") return ["c/kWh", "cents/kWh", "AUD/kWh", "$/kWh"];
  if (field === "existingKwh" || field === "proposedKwh") return ["kWh/year", "kWh/annum", "kWh"];
  if (field === "installedCost") return ["AUD", "USD", "EUR", "GBP", "NZD", "$"];
  if (field === "proposedRecurring") return ["AUD/year", "AUD/month", "AUD/visit", "USD/year", "USD/month", "EUR/year", "EUR/month", "GBP/year", "GBP/month", "NZD/year", "NZD/month", "$/year", "$/month", "$/visit"];
  return [];
}
export function unknownDocumentField(field: DocumentField): ProposedDocumentField {
  return { field, value: null, unit: null, sourcePage: null, sourceExcerpt: null, needsConfirmation: true, calculationBasis: null };
}
export function validDocumentValue(field: DocumentField, value: unknown, unit: unknown): boolean {
  if (isNumericDocumentField(field)) return typeof value === "number" && Number.isFinite(value) && value >= 0 && value <= 10000000 && typeof unit === "string" && documentUnits(field).includes(unit);
  if (unit !== null || typeof value !== "string" || !value.trim() || value.length > 1000) return false;
  if (["periodStart", "periodEnd", "quoteDate"].includes(field)) return validDate(value);
  if (field === "currency") return /^(AUD|USD|EUR|GBP|NZD)$/.test(value);
  return true;
}
const object = (value: unknown): value is Record<string, unknown> => !!value && typeof value === "object" && !Array.isArray(value);
export function isDocumentImportResult(value: unknown): value is DocumentImportResult {
  if (!object(value) || Object.keys(value).length !== 6 || value.schemaVersion !== 1 || !documentKinds.includes(value.documentKind as DocumentKind) || !["existing", "proposed"].includes(String(value.acRole)) || !["pdf-text", "visual"].includes(String(value.evidenceMode)) || typeof value.pageCount !== "number" || !Number.isInteger(value.pageCount) || value.pageCount < 1 || value.pageCount > DOCUMENT_MAX_PAGES || !Array.isArray(value.fields)) return false;
  const expected = fieldsForDocument(value.documentKind as DocumentKind, value.acRole as AcRole);
  if (value.fields.length !== expected.length || new Set(value.fields.map(f => object(f) ? f.field : null)).size !== expected.length) return false;
  return value.fields.every(f => {
    if (!object(f) || Object.keys(f).length !== 7 || !expected.includes(f.field as DocumentField) || f.needsConfirmation !== true) return false;
    if (f.sourcePage !== null && (typeof f.sourcePage !== "number" || !Number.isInteger(f.sourcePage) || f.sourcePage < 1 || f.sourcePage > (value.pageCount as number))) return false;
    if (f.sourceExcerpt !== null && (typeof f.sourceExcerpt !== "string" || !f.sourceExcerpt.trim() || f.sourceExcerpt.length > 1000)) return false;
    if (f.calculationBasis !== null && (typeof f.calculationBasis !== "string" || !f.calculationBasis.trim() || f.calculationBasis.length > 500)) return false;
    return f.value === null ? f.unit === null : validDocumentValue(f.field as DocumentField, f.value, f.unit) && f.sourcePage !== null && f.sourceExcerpt !== null;
  });
}
export function documentExtractionSchema(kind: DocumentKind, role: AcRole) {
  return { type: "object", additionalProperties: false, required: ["fields"], properties: { fields: { type: "array", maxItems: fieldsForDocument(kind, role).length, items: { type: "object", additionalProperties: false, required: ["field", "value", "unit", "sourcePage", "sourceExcerpt", "needsConfirmation", "calculationBasis"], properties: {
    field: { type: "string", enum: fieldsForDocument(kind, role) }, value: { type: ["string", "number", "null"] }, unit: { type: ["string", "null"] }, sourcePage: { type: ["integer", "null"] }, sourceExcerpt: { type: ["string", "null"] }, needsConfirmation: { type: "boolean", enum: [true] }, calculationBasis: { type: ["string", "null"] },
  } } } } };
}
