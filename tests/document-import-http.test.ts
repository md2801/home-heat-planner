import assert from "node:assert/strict";
import test from "node:test";
import { createDocumentImportHandler } from "../src/server/document-import/http.ts";
import { DocumentImportError } from "../src/server/document-import/upload.ts";
import { fieldsForDocument, unknownDocumentField } from "../src/contracts/document-import.ts";
function request(query = "kind=ac-label", type = "image/png", headers: Record<string, string> = {}) { return new Request(`https://planner.example/api/document-import?${query}`, { method: "POST", headers: { "content-type": type, ...headers }, body: "temporary content" }); }
test("upload endpoint returns review-only proposals and clears temporary bytes", async () => {
  let bytes: Uint8Array | undefined;
  const handler = createDocumentImportHandler(async (document, kind, role) => {
    bytes = document.bytes;
    return { schemaVersion: 1, documentKind: kind, acRole: role, pageCount: 1, evidenceMode: "visual", fields: fieldsForDocument(kind, role).map(unknownDocumentField) };
  }, async (data, mime) => ({ bytes: data, mime, pageCount: 1, pageTexts: [null] }));
  const response = await handler(request("kind=installation-quote"));
  assert.equal(response.status, 200); assert.equal(response.headers.get("cache-control"), "private, no-store");
  const result = await response.json();
  assert.ok(result.result.fields.every((field: { needsConfirmation: boolean }) => field.needsConfirmation));
  assert.ok(bytes?.every(byte => byte === 0));
});
test("wrong document kinds, foreign origins, duplicate options and unsupported types fail before provider calls", async () => {
  let calls = 0;
  const handler = createDocumentImportHandler(async () => { calls++; throw new Error("should not run"); });
  for (const [req, status] of [[request("kind=unknown"), 400], [request("kind=ac-label&kind=ac-label"), 400], [request("kind=ac-label&acRole=unknown"), 400], [request("kind=ac-label", "image/png", { origin: "https://foreign.example" }), 403], [request("kind=ac-label", "text/html"), 415]] as const) assert.equal((await handler(req)).status, status);
  assert.equal(calls, 0);
});
test("provider and parser failures preserve privacy and cannot become successful saves", async () => {
  const handler = createDocumentImportHandler(async () => { throw new DocumentImportError("Reading unavailable", 503); }, async (bytes, mime) => ({ bytes, mime, pageCount: 1, pageTexts: [null] }));
  const response = await handler(request());
  assert.equal(response.status, 503); assert.deepEqual(await response.json(), { ok: false, message: "Reading unavailable" });
  const failed = createDocumentImportHandler(undefined, async () => { throw new Error("secret document contents"); });
  assert.equal((await (await failed(request())).text()).includes("secret"), false);
});
