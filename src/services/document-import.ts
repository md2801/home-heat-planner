import { isDocumentImportResult, DOCUMENT_MAX_BYTES, type AcRole, type DocumentKind, type DocumentImportResponse } from "../contracts/document-import.ts";
export function documentMime(file: Pick<File, "name" | "type">): string | null {
  if (/\.pdf$/i.test(file.name) && ["application/pdf", ""].includes(file.type)) return "application/pdf";
  if (/\.jpe?g$/i.test(file.name) && ["image/jpeg", ""].includes(file.type)) return "image/jpeg";
  if (/\.png$/i.test(file.name) && ["image/png", ""].includes(file.type)) return "image/png";
  return null;
}
export function validateDocumentFile(file: Pick<File, "name" | "type" | "size">): string | null {
  if (!documentMime(file)) return "Choose a PDF, JPG or PNG document.";
  if (!file.size) return "This document is empty. Choose another file.";
  if (file.size > DOCUMENT_MAX_BYTES) return "Choose a document no larger than 4 MB.";
  return null;
}
export async function uploadDocument(file: File, kind: DocumentKind, role: AcRole, signal: AbortSignal): Promise<DocumentImportResponse> {
  const invalid = validateDocumentFile(file);
  if (invalid) return { ok: false, message: invalid };
  try {
    const response = await fetch(`/api/document-import?kind=${kind}&acRole=${role}`, { method: "POST", headers: { "Content-Type": documentMime(file)! }, body: file, signal, cache: "no-store" });
    const value: unknown = await response.json();
    if (response.ok && value && typeof value === "object" && "ok" in value && value.ok === true && "result" in value && isDocumentImportResult(value.result) && value.result.documentKind === kind && value.result.acRole === role) return { ok: true, result: value.result };
    return { ok: false, message: value && typeof value === "object" && "message" in value && typeof value.message === "string" && value.message.length <= 500 ? value.message : "The document could not be read. Retry with a clearer file." };
  } catch (error) {
    if (signal.aborted) throw error;
    return { ok: false, message: "The connection was interrupted. Your existing assessment is unchanged. Retry shortly." };
  }
}
