import { fieldsForDocument, isDocumentImportResult, unknownDocumentField, type AcRole, type DocumentKind, type DocumentImportResult, type ProposedDocumentField } from "../../contracts/document-import.ts";
import { evidenceMatches } from "../energy-bill-validation.ts";
import { DocumentImportError, type DocumentUpload } from "./upload.ts";
const record = (v: unknown): v is Record<string, unknown> => !!v && typeof v === "object" && !Array.isArray(v);
const compact = (v: string) => v.replace(/\s+/g, " ").trim();
const quantity = "(?<![\\d.,+-])([+-]?(?:\\d{1,3}(?:,\\d{3})+|\\d+)(?:\\.\\d+)?)(?![\\d,]|\\.\\d)";
const separator = "\\s*[)\\]]?\\s*[:=]?\\s*";
/** The quantity and its unit must be associated, not merely present somewhere in an excerpt. */
function quantityEvidence(value: number, unit: string, text: string): boolean {
  const patterns: string[] = [];
  if (["c/kWh", "cents/kWh", "AUD/kWh", "$/kWh"].includes(unit)) {
    const currency = unit.startsWith("c") ? "(?:c|cents)" : unit.startsWith("AUD") ? "AUD" : "\\$";
    const denominator = "(?:/|per)\\s*kWh\\b";
    patterns.push(`${quantity}\\s*${currency}\\s*${denominator}`, `${currency}\\s*${denominator}${separator}${quantity}`);
    if (!unit.startsWith("c")) patterns.push(`${currency}\\s*${quantity}\\s*${denominator}`);
  } else if (unit.startsWith("kWh")) {
    const annual = unit !== "kWh";
    const energyUnit = annual ? "kWh\\s*(?:/|per)\\s*(?:year|annum)\\b" : "kWh\\b(?!\\s*(?:/|per)\\s*[a-z])";
    patterns.push(`${quantity}\\s*${energyUnit}`, `${energyUnit}${separator}${quantity}`);
  } else {
    const [code, period] = unit.split("/");
    const currency = code === "$" ? "\\$" : `\\b${code}\\b`;
    const amount = `(?:${currency}\\s*${quantity}|${quantity}\\s*${currency})`;
    if (!period) patterns.push(amount);
    else {
      const recurrence = `(?:/|per)\\s*${period}\\b`;
      const adjective = period === "year" ? "annual(?:ly)?|yearly" : period === "month" ? "monthly" : "per\\s+visit";
      patterns.push(`${amount}\\s*${recurrence}`, `${currency}\\s*${recurrence}${separator}${quantity}`, `(?:${adjective})[^\\d]{0,50}${amount}`);
    }
  }
  return patterns.some(pattern => [...text.matchAll(new RegExp(pattern, "gi"))].some(match => match.slice(1).some(token => token !== undefined && Number(token.replaceAll(",", "")) === value)));
}
function dateEvidence(value: string, text: string): boolean {
  if (text.includes(value)) return true;
  const [year, month, day] = value.split("-").map(Number);
  const dates = [...text.matchAll(/\b(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})\b/g)];
  if (dates.some(m => Number(m[1]) === day && Number(m[2]) === month && Number(m[3]) === year)) return true;
  const names = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  return new RegExp(`\\b0?${day}\\s+(?:${names[month! - 1]}|${names[month! - 1]?.slice(0, 3)})\\s+${year}\\b`, "i").test(text);
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
    const basisSupported = proposed.calculationBasis === null || compact(excerpt).includes(compact(proposed.calculationBasis));
    if (proposed.value === null) return basisSupported ? proposed : { ...proposed, calculationBasis: null };
    const sourceValue = typeof proposed.value === "number" ? proposed.unit !== null && quantityEvidence(proposed.value, proposed.unit, excerpt) : ["periodStart", "periodEnd", "quoteDate"].includes(field) ? dateEvidence(proposed.value, excerpt) : compact(excerpt).includes(compact(proposed.value));
    const cooling = !["existingKwh", "proposedKwh"].includes(field) || /\bcooling\b/i.test(excerpt) && !/\bheating\b|\bcapacity\b|input\s*power|whole[ -](?:home|property)|\bhousehold\b|\bbilling\b/i.test(excerpt);
    if (!sourceValue || !basisSupported || !cooling) return { ...proposed, value: null, unit: null, calculationBasis: null };
    return proposed;
  });
  const tariff = fields.find(f => f.field === "tariffType");
  const allText = document.pageTexts.filter(Boolean).join(" ");
  if (kind === "electricity-bill" && /time[ -]of[ -]use|\bpeak\b|\bshoulder\b|controlled[ -]load/i.test(`${tariff?.value ?? ""} ${allText} ${fields.map(f => f.sourceExcerpt ?? "").join(" ")}`)) {
    const rate = fields.find(f => f.field === "usageRateAud")!;
    rate.value = null; rate.unit = null; rate.calculationBasis = null;
  }
  const start = fields.find(f => f.field === "periodStart"), end = fields.find(f => f.field === "periodEnd");
  if (typeof start?.value === "string" && typeof end?.value === "string" && start.value > end.value) { start.value = null; start.unit = null; end.value = null; end.unit = null; }
  return { schemaVersion: 1, documentKind: kind, acRole: role, pageCount: document.pageCount, evidenceMode: document.pageTexts.every(t => t !== null) ? "pdf-text" : "visual", fields };
}
