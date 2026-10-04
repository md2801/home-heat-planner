import assert from "node:assert/strict";
import test from "node:test";
import { fieldsForDocument, isDocumentImportResult, unknownDocumentField, validDocumentValue, documentFieldLabel } from "../src/contracts/document-import.ts";
test("document field lists reuse the existing bill and replacement identities", () => {
  assert.deepEqual(fieldsForDocument("ac-label", "existing"), ["existingModel", "existingKwh"]);
  assert.deepEqual(fieldsForDocument("ac-label", "proposed"), ["proposedModel", "proposedKwh"]);
  assert.equal(documentFieldLabel("installedCost"), "Installed replacement quote (AUD)");
  assert.ok(!fieldsForDocument("electricity-bill", "existing").includes("existingKwh"));
});
test("units stay printed and power cannot masquerade as cooling energy", () => {
  assert.ok(validDocumentValue("usageRateAud", 30, "c/kWh"));
  assert.ok(validDocumentValue("proposedRecurring", 10, "AUD/month"));
  assert.ok(!validDocumentValue("existingKwh", 2.5, "kW"));
  assert.ok(!validDocumentValue("usageRateAud", 30, "c/day"));
  assert.ok(!validDocumentValue("proposedRecurring", null, "AUD/year"));
});
test("unknown fields and zero are distinct; all proposals require confirmation", () => {
  const fields = fieldsForDocument("installation-quote", "existing").map(unknownDocumentField);
  const result = { schemaVersion: 1, documentKind: "installation-quote", acRole: "existing", pageCount: 1, evidenceMode: "visual", fields };
  assert.ok(isDocumentImportResult(result));
  assert.ok(validDocumentValue("installedCost", 0, "AUD"));
  assert.ok(!isDocumentImportResult({ ...result, fields: fields.map(f => ({ ...f, needsConfirmation: false })) }));
});
