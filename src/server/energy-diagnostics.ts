export type EnergyStage = "FILE_VALIDATION_FAILED" | "PDF_PARSE_FAILED" | "PDF_TEXT_EMPTY" | "PDF_TEXT_INSUFFICIENT" | "PDF_PROCESSING_LIMIT" | "PDF_PARSED" | "OPENAI_REQUEST_FAILED" | "OPENAI_TIMEOUT" | "OPENAI_REFUSAL" | "OPENAI_INCOMPLETE" | "OPENAI_STRUCTURED_OUTPUT_INVALID" | "BILL_SCHEMA_INVALID" | "BILL_CORE_FIELDS_INSUFFICIENT" | "BILL_NORMALISATION_FAILED" | "BILL_EVIDENCE_UNSUPPORTED" | "BILL_EVIDENCE_NORMALISED" | "BILL_EXTRACTION_SUCCESS";
export const energyMessages = {
  file: "Choose an electricity bill in PDF format, smaller than 4 MB.",
  invalid: "This file couldn't be read as a valid PDF. Check that it isn't damaged or password-protected.",
  noText: "I couldn't find readable digital text in this PDF. This prototype currently works best with electricity bills where the text can be selected and copied.",
  insufficient: "I could read the text in this PDF, but I couldn't confidently identify enough electricity-bill details.",
  provider: "I could read your bill, but the analysis service is temporarily unavailable. Please try again.",
} as const;
export class EnergyError extends Error {
  readonly stage: EnergyStage;
  readonly status: number;
  constructor(stage: EnergyStage, message: string, status = 422) { super(message); this.name = "EnergyError"; this.stage = stage; this.status = status; }
}
export type EnergyMetadata = { pages?: number; characters?: number; meaningful?: boolean; containsKwh?: boolean; containsCurrency?: boolean; containsDates?: boolean; containsUsage?: boolean; containsSupply?: boolean; fields?: string[]; status?: "full" | "partial"; reason?: "missing-config" | "hosting-guard" | "local-limit" | "whitespace-only" | "unsupported-excerpt" };
/** Deliberately accept only fixed metadata; no text, values, filenames or exception messages. */
export function energyDiagnostic(stage: EnergyStage, metadata: EnergyMetadata = {}) {
  if (process.env.NODE_ENV === "production" && ["PDF_PARSED", "BILL_EXTRACTION_SUCCESS"].includes(stage)) return;
  console.info("[energy-bill]", JSON.stringify({ stage, ...metadata }));
}
export function energyFailure(stage: EnergyStage, message: string, status = 422, metadata: EnergyMetadata = {}): EnergyError {
  energyDiagnostic(stage, metadata); return new EnergyError(stage, message, status);
}
