import { createHash } from "node:crypto";
import { documentKinds, type AcRole, type DocumentKind } from "../../contracts/document-import.ts";
import { sameOriginRequest } from "../request-origin.ts";
import { createDocumentExtractor, type DocumentExtractor } from "./extraction.ts";
import { DocumentImportError, inspectDocument, readDocumentBytes } from "./upload.ts";
const headers = { "Cache-Control": "private, no-store", "Referrer-Policy": "no-referrer" };
export function createDocumentImportHandler(extract: DocumentExtractor = createDocumentExtractor(), inspect = inspectDocument) {
  return async (request: Request): Promise<Response> => {
    let bytes: Uint8Array | undefined;
    try {
      if (!sameOriginRequest(request)) throw new DocumentImportError("Open document review in this app before uploading.", 403);
      const url = new URL(request.url);
      const kind = url.searchParams.get("kind"), role = url.searchParams.get("acRole") ?? "existing";
      if (!documentKinds.includes(kind as DocumentKind) || !["existing", "proposed"].includes(role) || [...url.searchParams.keys()].some(key => !["kind", "acRole"].includes(key)) || url.searchParams.getAll("kind").length !== 1 || url.searchParams.getAll("acRole").length > 1) throw new DocumentImportError("Choose an electricity bill, AC label or installation quote.");
      const upload = await readDocumentBytes(request);
      bytes = upload.bytes;
      const document = await inspect(bytes, upload.mime);
      const client = createHash("sha256").update(process.env.VERCEL ? request.headers.get("x-forwarded-for") ?? "unknown" : "local-demo").digest("hex");
      const result = await extract(document, kind as DocumentKind, role as AcRole, client, request.signal);
      return Response.json({ ok: true, result }, { headers });
    } catch (error) {
      const message = error instanceof DocumentImportError ? error.message : "This document could not be processed. Try another file or retry shortly.";
      return Response.json({ ok: false, message }, { status: error instanceof DocumentImportError ? error.status : 503, headers });
    } finally { bytes?.fill(0); }
  };
}
