import { getDocumentProxy } from "unpdf";
import { DOCUMENT_MAX_BYTES, DOCUMENT_MAX_PAGES, DOCUMENT_MAX_TEXT } from "../../contracts/document-import.ts";
export type DocumentMime = "application/pdf" | "image/jpeg" | "image/png";
export interface DocumentUpload { bytes: Uint8Array; mime: DocumentMime; pageCount: number; pageTexts: (string | null)[] }
export class DocumentImportError extends Error {
  status: number;
  constructor(message: string, status = 400) { super(message); this.status = status; }
}
export async function readDocumentBytes(request: Request): Promise<{ bytes: Uint8Array; mime: DocumentMime }> {
  const mime = request.headers.get("content-type")?.split(";")[0]?.trim();
  if (!["application/pdf", "image/jpeg", "image/png"].includes(mime ?? "")) throw new DocumentImportError("Choose a PDF, JPG or PNG document.", 415);
  const reader = request.body?.getReader();
  if (!reader) throw new DocumentImportError("Choose a document that is not empty.");
  const chunks: Uint8Array[] = [];
  let length = 0;
  try {
    while (true) {
      const chunk = await reader.read();
      if (chunk.done) break;
      length += chunk.value.byteLength;
      if (length > DOCUMENT_MAX_BYTES) { await reader.cancel(); throw new DocumentImportError("Choose a document no larger than 4 MB.", 413); }
      chunks.push(chunk.value);
    }
  } finally { reader.releaseLock(); }
  if (!length) throw new DocumentImportError("Choose a document that is not empty.");
  const bytes = new Uint8Array(length);
  let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
  return { bytes, mime: mime as DocumentMime };
}
export function imageDimensions(bytes: Uint8Array, mime: Exclude<DocumentMime, "application/pdf">): { width: number; height: number } {
  const data = Buffer.from(bytes);
  let width = 0, height = 0;
  if (mime === "image/png") {
    if (data.length < 33 || !data.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])) || data.toString("ascii", 12, 16) !== "IHDR") throw new DocumentImportError("This file is not a readable PNG. Choose another document.");
    width = data.readUInt32BE(16); height = data.readUInt32BE(20);
  } else {
    if (data.length < 4 || data[0] !== 255 || data[1] !== 216 || data[data.length - 2] !== 255 || data[data.length - 1] !== 217) throw new DocumentImportError("This file is not a readable JPG. Choose another document.");
    let offset = 2;
    while (offset + 4 <= data.length) {
      if (data[offset] !== 255) break;
      while (data[offset] === 255) offset++;
      const marker = data[offset++]!;
      if ([0xd8, 0xd9].includes(marker)) continue;
      if (marker === 0xda || offset + 2 > data.length) break;
      const size = data.readUInt16BE(offset);
      if (size < 2 || offset + size > data.length) break;
      if ([0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf].includes(marker) && size >= 8) { height = data.readUInt16BE(offset + 3); width = data.readUInt16BE(offset + 5); break; }
      offset += size;
    }
  }
  if (!width || !height) throw new DocumentImportError("The image could not be read. Choose another JPG or PNG.");
  if (width * height > 20000000 || width > 12000 || height > 12000) throw new DocumentImportError("Resize the image to no more than 20 megapixels before uploading.", 413);
  return { width, height };
}
let activeParsers = 0;
export async function inspectDocument(bytes: Uint8Array, mime: DocumentMime): Promise<DocumentUpload> {
  if (mime !== "application/pdf") { imageDimensions(bytes, mime); return { bytes, mime, pageCount: 1, pageTexts: [null] }; }
  if (new TextDecoder().decode(bytes.subarray(0, 5)) !== "%PDF-") throw new DocumentImportError("This file is not a readable PDF. Choose another document.");
  if (activeParsers >= 2) throw new DocumentImportError("Another document is being checked. Retry shortly.", 503);
  activeParsers++;
  let pdf: Awaited<ReturnType<typeof getDocumentProxy>> | undefined;
  let expired = false;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const parse = async () => {
    try {
      pdf = await getDocumentProxy(bytes.slice(), { useSystemFonts: false, verbosity: 0 });
      if (expired) throw new DocumentImportError("Document checking took too long. Try a shorter PDF.", 503);
      if (pdf.numPages < 1 || pdf.numPages > DOCUMENT_MAX_PAGES) throw new DocumentImportError("Choose a PDF with no more than 12 pages.");
      const pageTexts: (string | null)[] = [];
      let characters = 0;
      for (let n = 1; n <= pdf.numPages; n++) {
        if (expired) throw new DocumentImportError("Document checking took too long. Try a shorter PDF.", 503);
        const page = await pdf.getPage(n);
        const content = await page.getTextContent();
        const text = content.items.map(item => "str" in item ? item.str + (item.hasEOL ? "\n" : " ") : "").join("");
        page.cleanup();
        characters += text.length;
        if (characters > DOCUMENT_MAX_TEXT) throw new DocumentImportError("Choose a shorter document with less text.");
        // Sparse/scanned pages use visual extraction rather than guessed text.
        pageTexts.push(text.replace(/\s/g, "").length >= 80 ? text : null);
      }
      return { bytes, mime, pageCount: pdf.numPages, pageTexts };
    } catch (error) {
      if (error instanceof DocumentImportError) throw error;
      throw new DocumentImportError("This PDF could not be opened. Try an unlocked PDF or a clear JPG or PNG.");
    } finally { if (pdf) await pdf.loadingTask.destroy().catch(() => undefined); activeParsers--; }
  };
  try { return await Promise.race([parse(), new Promise<never>((_, reject) => { timer = setTimeout(() => { expired = true; reject(new DocumentImportError("Document checking took too long. Try a shorter PDF.", 503)); }, 10000); })]); }
  finally { if (timer) clearTimeout(timer); expired = true; if (pdf) await pdf.loadingTask.destroy().catch(() => undefined); }
}
