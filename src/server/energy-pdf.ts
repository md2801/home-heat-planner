import { getDocumentProxy } from "unpdf";
import { MAX_BILL_TEXT, MAX_PDF_BYTES, MAX_PDF_PAGES } from "../contracts/energy-assistant.ts";
import { EnergyError, energyDiagnostic, energyFailure, energyMessages } from "./energy-diagnostics.ts";
import { normalizeBillText } from "./energy-bill-validation.ts";
export const unreadablePdf = energyMessages.noText;
export function checkPdfText(text: string): string {
  const normalized = normalizeBillText(text), characters = normalized.replace(/\s/g, "").length;
  if (!characters) throw energyFailure("PDF_TEXT_EMPTY", unreadablePdf);
  if (characters < 80) throw energyFailure("PDF_TEXT_INSUFFICIENT", unreadablePdf);
  if (normalized.length > MAX_BILL_TEXT) throw energyFailure("PDF_PROCESSING_LIMIT", "This PDF contains too much text. Choose a shorter electricity bill.");
  return normalized;
}
export async function boundedPdfBytes(request: Request): Promise<Uint8Array> {
  const reader = request.body?.getReader(); if (!reader) throw energyFailure("FILE_VALIDATION_FAILED", energyMessages.file, 400);
  const chunks: Uint8Array[] = []; let size = 0;
  try {
    while (true) {
      const chunk = await reader.read(); if (chunk.done) break;
      size += chunk.value.length;
      if (size > MAX_PDF_BYTES) { await reader.cancel(); throw energyFailure("FILE_VALIDATION_FAILED", energyMessages.file, 413); }
      chunks.push(chunk.value);
    }
  } finally { reader.releaseLock(); }
  const data = new Uint8Array(size); let offset = 0;
  for (const chunk of chunks) { data.set(chunk, offset); offset += chunk.length; }
  if (new TextDecoder().decode(data.subarray(0, 5)) !== "%PDF-") throw energyFailure("FILE_VALIDATION_FAILED", energyMessages.invalid, 400);
  return data;
}
let processing = 0;
export async function readBillPdf(data: Uint8Array): Promise<string> {
  if (processing >= 2) throw energyFailure("PDF_PROCESSING_LIMIT", "Another bill is being processed. Please retry shortly.", 503);
  processing++;
  let pdf: Awaited<ReturnType<typeof getDocumentProxy>> | undefined;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let expired = false;
  const parse = async () => {
    pdf = await getDocumentProxy(data, { useSystemFonts: false });
    if (expired) { await pdf.loadingTask.destroy(); throw new Error("Bill processing timed out."); }
    if (pdf.numPages > MAX_PDF_PAGES) throw energyFailure("PDF_PROCESSING_LIMIT", "Choose a bill with no more than 12 pages.");
    let text = "";
    for (let n = 1; n <= pdf.numPages; n++) {
      if (expired) throw new Error("Bill processing timed out.");
      const page = await pdf.getPage(n), content = await page.getTextContent();
      text += content.items.map(item => "str" in item ? item.str + (item.hasEOL ? "\n" : " ") : "").join("") + "\n";
      page.cleanup();
      if (text.length > MAX_BILL_TEXT) throw energyFailure("PDF_PROCESSING_LIMIT", "This bill contains too much text. Choose a shorter bill.");
    }
    energyDiagnostic("PDF_PARSED", { pages: pdf.numPages, characters: text.length, meaningful: text.replace(/\s/g, "").length >= 80, containsKwh: /kWh/i.test(text), containsCurrency: /\$\s*\d|\d+\.\d{2}/.test(text), containsDates: /\d{1,2}[/.-]\d{1,2}|\d{1,2}\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)/i.test(text), containsUsage: /usage|consumption/i.test(text), containsSupply: /supply|service charge/i.test(text) });
    return checkPdfText(text);
  };
  try {
    return await Promise.race([parse(), new Promise<never>((_, reject) => { timer = setTimeout(() => { expired = true; reject(energyFailure("PDF_PROCESSING_LIMIT", "Bill processing took too long. Retry with a shorter digital PDF.", 503)); }, 10000); })]);
  } catch (error) {
    if (error instanceof EnergyError) throw error;
    throw energyFailure("PDF_PARSE_FAILED", energyMessages.invalid);
  } finally { if (timer) clearTimeout(timer); if (pdf) await pdf.loadingTask.destroy().catch(() => undefined); processing--; }
}
