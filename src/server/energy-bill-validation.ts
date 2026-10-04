import { billFields, hasCoreBill, isBill, normalizeExtractedRates, type Bill, type BillKey, type TariffComponent } from "../contracts/energy-assistant.ts";
import { energyDiagnostic, energyFailure, energyMessages } from "./energy-diagnostics.ts";
/** Whitespace equivalence only: no punctuation stripping, digit changes or fuzzy/reordered token matching. */
export function normalizeBillText(text: string): string {
  return text.replace(/\r\n?/g, "\n").replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, " ").replace(/[\t\u00a0 ]+/g, " ").replace(/ *\n */g, "\n").replace(/\n{3,}/g, "\n\n").trim();
}
export function evidenceMatches(text: string, excerpt: string): boolean {
  const compact = (v: string) => normalizeBillText(v).replace(/\s+/g, " ").trim();
  return !!excerpt.trim() && compact(text).includes(compact(excerpt));
}
export function validateExtractedBill(raw: unknown, text: string): Bill {
  let normalized: unknown;
  try { normalized = normalizeExtractedRates(raw); }
  catch { throw energyFailure("BILL_NORMALISATION_FAILED", energyMessages.insufficient); }
  if (!isBill(normalized)) throw energyFailure("BILL_SCHEMA_INVALID", energyMessages.insufficient);
  const bill = structuredClone(normalized);
  const unsupported: string[] = [], whitespace: string[] = [];
  for (const key of Object.keys(billFields) as BillKey[]) {
    const field = bill[key]; if (field.value === null) continue;
    if (!field.evidence || !evidenceMatches(text, field.evidence)) { unsupported.push(key); (bill[key] as Bill[BillKey]) = { value: null, evidence: null }; }
    else if (!text.includes(field.evidence)) whitespace.push(key);
  }
  const tariffs: TariffComponent[] = [];
  for (const component of bill.tariffComponents ?? []) {
    if (evidenceMatches(text, component.evidence)) tariffs.push(component);
    else unsupported.push("tariffComponent");
  }
  if (bill.tariffComponents) bill.tariffComponents = tariffs;
  if (tariffs.filter(t => t.kind !== "solar-feed-in").length > 1) bill.usageRateAud = { value: null, evidence: null };
  if (unsupported.length) energyDiagnostic("BILL_EVIDENCE_UNSUPPORTED", { fields: unsupported, reason: "unsupported-excerpt" });
  if (whitespace.length) energyDiagnostic("BILL_EVIDENCE_NORMALISED", { fields: whitespace, reason: "whitespace-only" });
  if (!hasCoreBill(bill)) throw energyFailure("BILL_CORE_FIELDS_INSUFFICIENT", energyMessages.insufficient);
  const missing = (Object.keys(billFields) as BillKey[]).filter(k => bill[k].value === null);
  energyDiagnostic("BILL_EXTRACTION_SUCCESS", { status: missing.length ? "partial" : "full", fields: missing });
  return bill;
}
