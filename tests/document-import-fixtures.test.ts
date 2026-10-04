import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import type { AcRole, DocumentKind } from "../src/contracts/document-import.ts";
import { createDocumentImportHandler } from "../src/server/document-import/http.ts";
import { validateDocumentExtraction } from "../src/server/document-import/validation.ts";
import { inspectDocument, type DocumentMime } from "../src/server/document-import/upload.ts";
const folder = new URL("./fixtures/document-import/", import.meta.url);
interface Fixture { file: string; mime: DocumentMime; kind: DocumentKind; acRole: AcRole; raw: unknown; expected: Record<string, unknown> }
const fixtures: Fixture[] = JSON.parse(await readFile(new URL("examples.json", folder), "utf8"));
for (const fixture of fixtures) test(`real ${fixture.file} upload preserves source values and unknowns`, async () => {
  const bytes = Uint8Array.from(await readFile(new URL(fixture.file, folder)));
  const inspected = await inspectDocument(bytes, fixture.mime);
  assert.equal(inspected.pageCount, 1);
  const proposals = validateDocumentExtraction(fixture.raw, inspected, fixture.kind, fixture.acRole);
  assert.deepEqual(Object.fromEntries(proposals.fields.map(field => [field.field, field.value])), fixture.expected);
  const handler = createDocumentImportHandler(async document => validateDocumentExtraction(fixture.raw, document, fixture.kind, fixture.acRole));
  const response = await handler(new Request(`https://planner.example/api/document-import?kind=${fixture.kind}&acRole=${fixture.acRole}`, { method: "POST", headers: { "content-type": fixture.mime }, body: new Blob([bytes], { type: fixture.mime }) }));
  assert.equal(response.status, 200);
  assert.deepEqual((await response.json()).result, proposals);
});
test("printed climate is preserved; inferred currency, years, climate and annualisation stay unknown", async () => {
  const image = await inspectDocument(Uint8Array.from(await readFile(new URL("ac-label.png", folder))), "image/png");
  const makeField = (field: string, value: unknown, unit: string | null, sourceExcerpt: string, calculationBasis: string | null = null) => ({ field, value, unit, sourcePage: 1, sourceExcerpt, needsConfirmation: true, calculationBasis });
  const coldClimate = validateDocumentExtraction({ fields: [makeField("existingKwh", 600, "kWh/year", "Annual cooling energy 600 kWh/year Cold climate", "Cold climate")] }, image, "ac-label", "existing");
  assert.equal(coldClimate.fields[1]?.value, 600); assert.equal(coldClimate.fields[1]?.calculationBasis, "Cold climate");
  const inferredClimate = validateDocumentExtraction({ fields: [makeField("existingKwh", 600, "kWh/year", "Annual cooling energy 600 kWh/year Cold climate", "Average climate")] }, image, "ac-label", "existing");
  assert.equal(inferredClimate.fields[1]?.value, null);
  const missingYear = validateDocumentExtraction({ fields: [makeField("periodStart", "2026-09-01", null, "Period begins 1 September")] }, image, "electricity-bill", "existing");
  assert.equal(missingYear.fields[1]?.value, null);
  const quote = validateDocumentExtraction({ fields: [makeField("currency", "AUD", null, "Total installed cost $1200"), makeField("proposedRecurring", 120, "AUD/year", "Maintenance AUD 10 per month")] }, image, "installation-quote", "proposed");
  assert.equal(quote.fields[1]?.value, null); assert.equal(quote.fields[4]?.value, null);
});
