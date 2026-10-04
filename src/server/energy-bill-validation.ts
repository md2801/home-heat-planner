import { billFields, hasCoreBill, isBill, normalizeExtractedRates, sumImportedTariffs, type Bill, type BillKey, type TariffComponent } from "../contracts/energy-assistant.ts";
import { energyDiagnostic, energyFailure, energyMessages } from "./energy-diagnostics.ts";
/** Whitespace equivalence only: no punctuation stripping, digit changes or fuzzy/reordered token matching. */
export function normalizeBillText(text: string): string {
  return text.replace(/\r\n?/g, "\n").replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, " ").replace(/[\t\u00a0 ]+/g, " ").replace(/ *\n */g, "\n").replace(/\n{3,}/g, "\n\n").trim();
}
export function evidenceMatches(text: string, excerpt: string): boolean {
  const compact = (v: string) => normalizeBillText(v).replace(/\s+/g, " ").trim();
  return !!excerpt.trim() && compact(text).includes(compact(excerpt));
}
function supportsKwhQuantity(excerpt: string, quantity: number): boolean {
  return [...excerpt.matchAll(/(?<![\d.,])\b(\d+(?:,\d{3})*(?:\.\d+)?)\s*kWh\b(?!\s*\/)/gi)].some(match => Number(match[1]?.replaceAll(",", "")) === quantity);
}
export function validateExtractedBill(raw: unknown, text: string): Bill {
  // This flag describes coverage, not a model-calculated total. Calculation metadata is app-only.
  if (!raw || typeof raw !== "object" || Array.isArray(raw) || "consumptionCalculation" in raw) throw energyFailure("BILL_SCHEMA_INVALID", energyMessages.insufficient);
  const { importRowsComplete, ...fields } = raw as Record<string, unknown>;
  if (importRowsComplete !== undefined && typeof importRowsComplete !== "boolean") throw energyFailure("BILL_SCHEMA_INVALID", energyMessages.insufficient);
  let normalized: unknown;
  try { normalized = normalizeExtractedRates(fields); }
  catch { throw energyFailure("BILL_NORMALISATION_FAILED", energyMessages.insufficient); }
  if (!isBill(normalized)) throw energyFailure("BILL_SCHEMA_INVALID", energyMessages.insufficient);
  const bill = structuredClone(normalized);
  const unsupported: string[] = [], whitespace: string[] = [];
  for (const key of Object.keys(billFields) as BillKey[]) {
    const field = bill[key]; if (field.value === null) continue;
    if (!field.evidence || !evidenceMatches(text, field.evidence) || (key === "consumptionKwh" && typeof field.value === "number" && !supportsKwhQuantity(field.evidence, field.value))) { unsupported.push(key); (bill[key] as Bill[BillKey]) = { value: null, evidence: null }; }
    else if (!text.includes(field.evidence)) whitespace.push(key);
  }
  const tariffs: TariffComponent[] = [];
  let unsupportedImportRow = false;
  for (const component of bill.tariffComponents ?? []) {
    if (evidenceMatches(text, component.evidence)) tariffs.push(component);
    else { unsupported.push("tariffComponent"); if (component.kind !== "solar-feed-in") unsupportedImportRow = true; }
  }
  if (bill.tariffComponents) bill.tariffComponents = tariffs;
  if (tariffs.filter(t => t.kind !== "solar-feed-in").length > 1) bill.usageRateAud = { value: null, evidence: null };
  if (unsupported.length) energyDiagnostic("BILL_EVIDENCE_UNSUPPORTED", { fields: unsupported, reason: "unsupported-excerpt" });
  if (whitespace.length) energyDiagnostic("BILL_EVIDENCE_NORMALISED", { fields: whitespace, reason: "whitespace-only" });
  if (bill.consumptionKwh.value === null && importRowsComplete === true && !unsupportedImportRow) {
    const sum = sumImportedTariffs(tariffs);
    // Require a printed kWh quantity in each row, not a rate, meter reading or daily average.
    const quantitiesSupported = sum?.componentIndexes.every(index => {
      const row = tariffs[index];
      return !!row && row.consumptionKwh !== null && supportsKwhQuantity(row.evidence, row.consumptionKwh);
    });
    if (sum && quantitiesSupported) {
      bill.consumptionKwh = { value: sum.total, evidence: null };
      bill.consumptionCalculation = { method: "sum-import-rows", componentIndexes: sum.componentIndexes };
    }
  }
  // A recognisable partial bill can still be reviewed and explained without inventing a total.
  const hasUsefulEnergyDetails = bill.consumptionKwh.value !== null || tariffs.length > 0 || (bill.usageRateAud.value !== null && (bill.billingDays.value !== null || bill.periodStart.value !== null));
  if (!hasCoreBill(bill) && !hasUsefulEnergyDetails) throw energyFailure("BILL_CORE_FIELDS_INSUFFICIENT", energyMessages.insufficient, 422, { fields: [bill.consumptionKwh.value === null ? "consumptionKwh" : null, bill.billingDays.value === null && (!bill.periodStart.value || !bill.periodEnd.value) ? "billingPeriod" : null].filter((field): field is string => field !== null) });
  const missing = (Object.keys(billFields) as BillKey[]).filter(k => bill[k].value === null);
  energyDiagnostic("BILL_EXTRACTION_SUCCESS", { status: missing.length ? "partial" : "full", fields: missing });
  return bill;
}
