import assert from "node:assert/strict";
import test from "node:test";
import { validateDocumentExtraction } from "../src/server/document-import/validation.ts";
import { unknownDocumentField, type DocumentField } from "../src/contracts/document-import.ts";
import type { DocumentUpload } from "../src/server/document-import/upload.ts";
const document = (text: string | null): DocumentUpload => ({ bytes: new Uint8Array(), mime: text ? "application/pdf" : "image/png", pageCount: 1, pageTexts: [text] });
const field = (field: DocumentField, value: string | number | null, unit: string | null, sourceExcerpt: string, calculationBasis: string | null = null) => ({ field, value, unit, sourcePage: 1, sourceExcerpt, needsConfirmation: true, calculationBasis });
test("printed cents remain cents; incorrect units and unsupported numerical conversions become unknown", () => {
  const text = "Flat tariff: Usage rate 30 c/kWh";
  const result = validateDocumentExtraction({ fields: [field("usageRateAud", 30, "c/kWh", text)] }, document(text), "electricity-bill", "existing");
  assert.equal(result.fields[0]?.value, 30); assert.equal(result.fields[0]?.unit, "c/kWh");
  for (const [value, unit] of [[0.3, "AUD/kWh"], [30, "c/day"], [30, "AUD/kWh"]] as const) assert.equal(validateDocumentExtraction({ fields: [field("usageRateAud", value, unit, text)] }, document(text), "electricity-bill", "existing").fields[0]?.value, null);
});
test("label energy requires explicit cooling, not heating or capacity, and retains its printed basis", () => {
  const text = "Annual cooling energy 600 kWh/year Average climate";
  const valid = field("existingKwh", 600, "kWh/year", text, "Average climate");
  assert.equal(validateDocumentExtraction({ fields: [valid] }, document(text), "ac-label", "existing").fields[1]?.value, 600);
  for (const excerpt of ["Cooling capacity 2.5 kW", "Annual heating energy 600 kWh/year", "Annual heating and cooling energy 600 kWh/year"]) assert.equal(validateDocumentExtraction({ fields: [field("existingKwh", 600, "kWh/year", excerpt)] }, document(excerpt), "ac-label", "existing").fields[1]?.value, null);
});
test("whole-home consumption cannot populate an AC or bedroom cooling field", () => {
  const text = "Whole-home electricity usage 650 kWh";
  assert.throws(() => validateDocumentExtraction({ fields: [field("existingKwh", 650, "kWh", text)] }, document(text), "electricity-bill", "existing"));
  assert.equal(validateDocumentExtraction({ fields: [field("existingKwh", 650, "kWh", text)] }, document(text), "ac-label", "existing").fields[1]?.value, null);
  const cooling = "Whole-home cooling energy 650 kWh";
  assert.equal(validateDocumentExtraction({ fields: [field("existingKwh", 650, "kWh", cooling)] }, document(cooling), "ac-label", "existing").fields[1]?.value, null);
});

test("bare printed cooling kWh does not acquire an annual or climate basis", () => {
  const text = "Cooling energy 600 kWh";
  const result = validateDocumentExtraction({ fields: [field("proposedKwh", 600, "kWh", text)] }, document(text), "ac-label", "proposed");
  assert.equal(result.fields[1]?.value, 600); assert.equal(result.fields[1]?.unit, "kWh"); assert.equal(result.fields[1]?.calculationBasis, null);
  assert.equal(validateDocumentExtraction({ fields: [field("proposedKwh", 600, "kWh/year", text)] }, document(text), "ac-label", "proposed").fields[1]?.value, null);
});

test("unknown values cannot carry an invented climate or recurrence basis", () => {
  const text = "Cooling energy unclear. Cold climate.";
  const result = validateDocumentExtraction({ fields: [field("existingKwh", null, null, text, "Average climate")] }, document(text), "ac-label", "existing");
  assert.equal(result.fields[1]?.value, null); assert.equal(result.fields[1]?.calculationBasis, null);
  assert.equal(result.fields[1]?.sourceExcerpt, text);
});
test("missing fields stay unknown; zero and monthly recurring charges are not inferred or annualised", () => {
  const text = "Maintenance AUD 10 per month. Installation AUD 0.";
  const result = validateDocumentExtraction({ fields: [field("proposedRecurring", 10, "AUD/month", text, "per month"), field("installedCost", 0, "AUD", text)] }, document(text), "installation-quote", "proposed");
  assert.equal(result.fields.find(f => f.field === "proposedRecurring")?.value, 10);
  assert.equal(result.fields[0]?.value, 0);
  assert.deepEqual(result.fields.find(f => f.field === "currency"), unknownDocumentField("currency"));
});
test("page/excerpt mismatches, unknown confirmation states and foreign fields are rejected safely", () => {
  const text = "Model identifier SYNTHETIC-AC";
  const result = validateDocumentExtraction({ fields: [field("existingModel", "INVENTED-AC", null, "Model identifier INVENTED-AC")] }, document(text), "ac-label", "existing");
  assert.equal(result.fields[0]?.value, null);
  assert.throws(() => validateDocumentExtraction({ fields: [{ ...field("existingModel", "SYNTHETIC-AC", null, text), sourcePage: 2 }] }, document(text), "ac-label", "existing"));
  assert.throws(() => validateDocumentExtraction({ fields: [{ ...field("existingModel", "SYNTHETIC-AC", null, text), needsConfirmation: false }] }, document(text), "ac-label", "existing"));
});
test("time-of-use rates are never averaged or selected as a single flat rate", () => {
  const text = "Time-of-use tariff. Peak usage 35 c/kWh. Off-peak usage 20 c/kWh.";
  const result = validateDocumentExtraction({ fields: [field("tariffType", "Time-of-use", null, text), field("usageRateAud", 35, "c/kWh", text)] }, document(text), "electricity-bill", "existing");
  assert.equal(result.fields[0]?.value, null); assert.equal(result.fields[3]?.value, "Time-of-use");
});

test("quantities must stay associated with their own units and recurring periods", () => {
  const bill = "Whole-home consumption 650 kWh. Usage rate 30 c/kWh.";
  assert.equal(validateDocumentExtraction({ fields: [field("usageRateAud", 650, "c/kWh", bill)] }, document(bill), "electricity-bill", "existing").fields[0]?.value, null);
  const quote = "Installation AUD 1200. Maintenance AUD 10 per month.";
  assert.equal(validateDocumentExtraction({ fields: [field("proposedRecurring", 1200, "AUD/month", quote)] }, document(quote), "installation-quote", "existing").fields[4]?.value, null);
  for (const text of ["Usage rate $0.30/kWh", "Usage rate AUD 0.30 per kWh", "Usage rate (AUD/kWh): 0.30"]) {
    const unit = text.includes("$") ? "$/kWh" : "AUD/kWh";
    const rate = validateDocumentExtraction({ fields: [field("usageRateAud", 0.3, unit, text)] }, document(text), "electricity-bill", "existing").fields[0];
    assert.equal(rate?.value, 0.3); assert.equal(rate?.unit, unit);
  }
  const negative = "Upfront cost AUD -1200";
  assert.equal(validateDocumentExtraction({ fields: [field("installedCost", 1200, "AUD", negative)] }, document(negative), "installation-quote", "existing").fields[0]?.value, null);
});
