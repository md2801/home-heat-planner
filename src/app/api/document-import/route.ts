import { createDocumentImportHandler } from "../../../server/document-import/http.ts";
export const runtime = "nodejs";
export const maxDuration = 60;
export const POST = createDocumentImportHandler();
