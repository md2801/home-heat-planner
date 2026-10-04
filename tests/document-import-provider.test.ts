import assert from "node:assert/strict";
import test from "node:test";
import { createDocumentExtractor } from "../src/server/document-import/extraction.ts";
import type { DocumentUpload } from "../src/server/document-import/upload.ts";
const document: DocumentUpload = { bytes: new TextEncoder().encode("temporary upload"), mime: "image/png", pageCount: 1, pageTexts: [null] };
function completed(value: unknown): Response { return Response.json({ status: "completed", output: [{ type: "message", content: [{ type: "output_text", text: JSON.stringify(value) }] }] }); }
test("OpenAI receives inline temporary content, strict schema, no stored response or original filename", async () => {
  let payload: Record<string, unknown> = {};
  const extract = createDocumentExtractor({ key: () => "test-key", hostingAllowed: () => true, call: async (_url, options) => { payload = JSON.parse(String(options?.body)); return completed({ fields: [] }); } });
  const result = await extract(document, "ac-label", "existing", "test");
  assert.equal(result.fields[0]?.value, null); assert.equal(payload.store, false);
  assert.match(JSON.stringify(payload.input), /input_image/);
  assert.match(JSON.stringify(payload.text), /json_schema/);
  assert.equal(JSON.stringify(payload).includes("file_id"), false);
  const pdf = { ...document, mime: "application/pdf" as const };
  await extract(pdf, "ac-label", "proposed", "test-pdf");
  assert.match(JSON.stringify(payload.input), /input_file/);
  assert.match(JSON.stringify(payload.input), /data:application\/pdf;base64/);
});
test("HTTP errors, network/timeout failures, malformed JSON, refusals and incomplete output fail without content leaks", async () => {
  for (const call of [
    async () => new Response("private contents", { status: 500 }),
    async () => { throw new Error("secret credential and document text"); },
    async () => { throw new DOMException("private upload", "TimeoutError"); },
    async () => new Response("not json"),
    async () => Response.json({ status: "incomplete", output: [] }),
    async () => Response.json({ status: "completed", output: [{ type: "message", content: [{ type: "refusal", refusal: "private contents" }] }] }),
  ] as typeof fetch[]) {
    await assert.rejects(createDocumentExtractor({ key: () => "test-key", hostingAllowed: () => true, call })(document, "ac-label", "existing", "test"), (error: unknown) => error instanceof Error && !/private|secret|credential/.test(error.message));
  }
});
test("missing configuration and hosted usage controls prevent provider calls", async () => {
  for (const config of [{ key: () => undefined, hostingAllowed: () => true }, { key: () => "test-key", hostingAllowed: () => false }]) {
    let called = false;
    const extract = createDocumentExtractor({ ...config, call: async () => { called = true; return completed({ fields: [] }); } });
    await assert.rejects(extract(document, "electricity-bill", "existing", "test"));
    assert.equal(called, false);
  }
});
test("per-client limits bound repeated provider requests without storing document contents", async () => {
  let calls = 0;
  const extract = createDocumentExtractor({ key: () => "test-key", hostingAllowed: () => true, call: async () => { calls++; return completed({ fields: [] }); } });
  for (let i = 0; i < 3; i++) await extract(document, "ac-label", "existing", "same-client");
  await assert.rejects(extract(document, "ac-label", "existing", "same-client"));
  assert.equal(calls, 3);
});
