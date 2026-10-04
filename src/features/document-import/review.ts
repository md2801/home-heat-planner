import { isNumericDocumentField, validDocumentValue, type DocumentImportResult, type ProposedDocumentField } from "../../contracts/document-import.ts";
export type ReviewDecision = "pending" | "accepted" | "corrected" | "rejected";
export interface ReviewedDocumentField {
  proposal: ProposedDocumentField;
  decision: ReviewDecision;
  value: string | number | null;
  unit: string | null;
  calculationBasis: string | null;
  reviewedAt: string | null;
}
export function startDocumentReview(result: DocumentImportResult): ReviewedDocumentField[] {
  return result.fields.map(proposal => ({ proposal, decision: "pending", value: proposal.value, unit: proposal.unit, calculationBasis: proposal.calculationBasis, reviewedAt: null }));
}
function timestamp(now: string) { if (!Number.isFinite(Date.parse(now))) throw new Error("Invalid review timestamp"); }
export function acceptDocumentField(item: ReviewedDocumentField, now: string): ReviewedDocumentField {
  timestamp(now);
  if (item.proposal.value === null || !validDocumentValue(item.proposal.field, item.proposal.value, item.proposal.unit)) throw new Error("Enter a value or keep this field unknown.");
  return { ...item, decision: "accepted", value: item.proposal.value, unit: item.proposal.unit, calculationBasis: item.proposal.calculationBasis, reviewedAt: now };
}
export function correctDocumentField(item: ReviewedDocumentField, raw: string, unit: string | null, basis: string, now: string): ReviewedDocumentField {
  timestamp(now);
  const value = isNumericDocumentField(item.proposal.field) && /^[+]?(\d+(\.\d*)?|\.\d+)$/.test(raw.trim()) ? Number(raw) : raw.trim();
  if (!validDocumentValue(item.proposal.field, value, unit) || basis.length > 500) throw new Error("Enter a valid value and select its printed unit. Keep uncertain values unknown.");
  return { ...item, decision: "corrected", value, unit, calculationBasis: basis.trim() || null, reviewedAt: now };
}
export function rejectDocumentField(item: ReviewedDocumentField, now: string): ReviewedDocumentField {
  timestamp(now);
  return { ...item, decision: "rejected", value: null, unit: null, calculationBasis: null, reviewedAt: now };
}
/** Explicit review only. This feature has no assessment repository or persistence import. */
export function finishDocumentReview(result: DocumentImportResult, items: ReviewedDocumentField[]) {
  if (items.length !== result.fields.length || items.some((item, i) => item.proposal !== result.fields[i] || item.decision === "pending" || !item.reviewedAt || !Number.isFinite(Date.parse(item.reviewedAt)))) throw new Error("Review each field before finishing.");
  return { schemaVersion: 1 as const, documentKind: result.documentKind, acRole: result.acRole, fields: items.map(item => ({ field: item.proposal.field, value: item.value, unit: item.unit, calculationBasis: item.calculationBasis, sourcePage: item.proposal.sourcePage, sourceExcerpt: item.proposal.sourceExcerpt, decision: item.decision, reviewedAt: item.reviewedAt, origin: item.decision === "corrected" ? "user-corrected" as const : item.decision === "accepted" ? "document-proposal-confirmed" as const : "unknown" as const })) };
}
