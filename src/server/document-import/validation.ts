import { fieldsForDocument, isDocumentImportResult, unknownDocumentField, type AcRole, type DocumentKind, type DocumentImportResult, type ProposedDocumentField } from "../../contracts/document-import.ts";
import { evidenceMatches } from "../energy-bill-validation.ts";
import { DocumentImportError, type DocumentUpload } from "./upload.ts";
const record = (v: unknown): v is Record<string, unknown> => !!v && typeof v === "object" && !Array.isArray(v);
const compact = (v: string) => v.replace(/\s+/g, " ").trim();
function numericEvidence(value: number, text: string): boolean {
  return [...text.matchAll(/(?:\d{1,3}(?:,\d{3})+|\d+)(?:\.\d+)?/g)].some(match => Number(match[0].replaceAll(",", "")) === value);
}
function dateEvidence(value: string, text: string): boolean {
  if (text.includes(value)) return true;
  const [year, month, day] = value.split("-").map(Number);
  const dates = [...text.matchAll(/\b(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})\b/g)];
  if (dates.some(m => Number(m[1]) === day && Number(m[2]) === month && Number(m[3]) === year)) return true;
  const names = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  return new RegExp(`\\b0?${day}\\s+(?:${names[month! - 1]}|${names[month! - 1]?.slice(0, 3)})\\s+${year}\\b`, "i").test(text);
}
function unitEvidence(unit: string, text: string): boolean {
  if (unit === "c/kWh" || unit === "cents/kWh") return /(?:\bc|\bcents)\s*(?:\/|per)\s*kWh\b/i.test(text);
  if (unit === "AUD/kWh" || unit === "$/kWh") return (unit !== "AUD/kWh" || /\bAUD\b/.test(text)) && /(?:\bAUD|\$)\s*(?:\/|per)\s*kWh\b/i.test(text);
  if (["kWh/year", "kWh/annum"].includes(unit)) return /kWh\s*(?:\/|per)\s*(?:year|annum)|annual\s+cooling\s+energy[\s\S]*kWh/i.test(text);
  if (unit === "kWh") return /\bkWh\b/i.test(text);
  const [currency, period] = unit.split("/");
  const currencyPresent = currency === "$" ? text.includes("$") : new RegExp(`\\b${currency}\\b`).test(text);
  if (!period) return currencyPresent;
  return currencyPresent && (period === "year" ? /\bannual(?:ly)?\b|\bper year\b|\/year\b/i : period === "month" ? /\bmonthly\b|\bper month\b|\/month\b/i : /\bper visit\b|\/visit\b/i).test(text);
}
/** Evidence checks constrain proposals, not OCR accuracy; visual excerpts still need human review. */
export function validateDocumentExtraction(raw: unknown, document: DocumentUpload, kind: DocumentKind, role: AcRole): DocumentImportResult {
  const expected = fieldsForDocument(kind, role);
  if (!record(raw) || Object.keys(raw).length !== 1 || !Array.isArray(raw.fields) || raw.fields.length > expected.length) throw new DocumentImportError("The document could not be read reliably. Retry with a clearer document.", 502);
  const supplied = new Map<string, ProposedDocumentField>();
  for (const value of raw.fields) {
    if (!record(value) || !expected.includes(value.field as ProposedDocumentField["field"]) || supplied.has(String(value.field))) throw new DocumentImportError("The document could not be read reliably. Retry with a clearer document.", 502);
    // Check structural shape before any evidence is considered.
    const candidate = { schemaVersion: 1, documentKind: kind, acRole: role, pageCount: document.pageCount, evidenceMode: "visual", fields: expected.map(field => field === value.field ? value : unknownDocumentField(field)) };
    if (!isDocumentImportResult(candidate)) {
      // A printed unit incompatible with the target field is an unknown, never a conversion.
      const sanitized = { ...value, value: null, unit: null };
      if (!isDocumentImportResult({ ...candidate, fields: expected.map(field => field === value.field ? sanitized : unknownDocumentField(field)) })) throw new DocumentImportError("The document could not be read reliably. Retry with a clearer document.", 502);
      supplied.set(String(value.field), sanitized as unknown as ProposedDocumentField);
    } else supplied.set(String(value.field), value as unknown as ProposedDocumentField);
  }
  const fields = expected.map(field => {
    const proposed = supplied.get(field) ?? unknownDocumentField(field);
    const excerpt = proposed.sourceExcerpt;
    const page = proposed.sourcePage;
    const text = page ? document.pageTexts[page - 1] : null;
    if (!excerpt || !page || text && !evidenceMatches(text, excerpt)) return unknownDocumentField(field);
    if (proposed.value === null) return proposed;
    const sourceValue = typeof proposed.value === "number" ? numericEvidence(proposed.value, excerpt) : ["periodStart", "periodEnd", "quoteDate"].includes(field) ? dateEvidence(proposed.value, excerpt) : compact(excerpt).includes(compact(proposed.value));
    const basisSupported = proposed.calculationBasis === null || compact(excerpt).includes(compact(proposed.calculationBasis));
    const unitSupported = proposed.unit === null || unitEvidence(proposed.unit, excerpt);
    const cooling = !["existingKwh", "proposedKwh"].includes(field) || /\bcooling\b/i.test(excerpt) && !/\bheating\b|\bcapacity\b|input\s*power/i.test(excerpt);
    if (!sourceValue || !basisSupported || !unitSupported || !cooling) return { ...proposed, value: null, unit: null, calculationBasis: null };
    return proposed;
  });
  const tariff = fields.find(f => f.field === "tariffType");
  const allText = document.pageTexts.filter(Boolean).join(" ");
  if (kind === "electricity-bill" && /time[ -]of[ -]use|\bpeak\b|\bshoulder\b|controlled[ -]load/i.test(`${tariff?.value ?? ""} ${allText}`)) {
    const rate = fields.find(f => f.field === "usageRateAud")!;
    rate.value = null; rate.unit = null; rate.calculationBasis = null;
  }
  const start = fields.find(f => f.field === "periodStart"), end = fields.find(f => f.field === "periodEnd");
  if (typeof start?.value === "string" && typeof end?.value === "string" && start.value > end.value) { start.value = null; start.unit = null; end.value = null; end.unit = null; }
  return { schemaVersion: 1, documentKind: kind, acRole: role, pageCount: document.pageCount, evidenceMode: document.pageTexts.every(t => t !== null) ? "pdf-text" : "visual", fields };
}
