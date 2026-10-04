import assert from "node:assert/strict";
import test from "node:test";
import { DOCUMENT_MAX_BYTES } from "../src/contracts/document-import.ts";
import { imageDimensions, inspectDocument, readDocumentBytes } from "../src/server/document-import/upload.ts";
test("upload rejects unsupported types, empty documents and streaming oversized bodies", async () => {
  for (const [type, body] of [["text/plain", "hello"], ["image/png", ""], ["application/pdf", "x".repeat(DOCUMENT_MAX_BYTES + 1)]]) await assert.rejects(readDocumentBytes(new Request("http://localhost", { method: "POST", headers: { "content-type": type! }, body: body! })));
});
test("file contents must match claimed PDF and image types", async () => {
  const bytes = new TextEncoder().encode("not a document");
  for (const mime of ["application/pdf", "image/png", "image/jpeg"] as const) await assert.rejects(inspectDocument(bytes, mime));
});
test("PNG dimensions are checked before provider calls", () => {
  const bytes = Buffer.alloc(33);
  Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]).copy(bytes);
  bytes.write("IHDR", 12); bytes.writeUInt32BE(800, 16); bytes.writeUInt32BE(600, 20);
  assert.deepEqual(imageDimensions(bytes, "image/png"), { width: 800, height: 600 });
  bytes.writeUInt32BE(12000, 16); bytes.writeUInt32BE(12000, 20);
  assert.throws(() => imageDimensions(bytes, "image/png"));
});
