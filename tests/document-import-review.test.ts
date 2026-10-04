import assert from "node:assert/strict";
import test from "node:test";
import { fieldsForDocument, unknownDocumentField, type DocumentImportResult } from "../src/contracts/document-import.ts";
import { acceptDocumentField, correctDocumentField, finishDocumentReview, rejectDocumentField, startDocumentReview } from "../src/features/document-import/review.ts";
const at = "2026-10-04T00:00:00.000Z";
function fixture(): DocumentImportResult {
  return { schemaVersion: 1, documentKind: "electricity-bill", acRole: "existing", pageCount: 1, evidenceMode: "visual", fields: fieldsForDocument("electricity-bill", "existing").map(field => field === "usageRateAud" ? { field, value: 30, unit: "c/kWh", sourcePage: 1, sourceExcerpt: "Usage 30 c/kWh", needsConfirmation: true, calculationBasis: null } : unknownDocumentField(field)) };
}
test("pending and unknown values cannot be accepted implicitly or finish review", () => {
  const result = fixture(), items = startDocumentReview(result);
  assert.throws(() => finishDocumentReview(result, items));
  assert.throws(() => acceptDocumentField(items[1]!, at));
  assert.equal(result.fields[0]?.needsConfirmation, true);
});
test("corrections keep the original evidence and require valid dates and printed units", () => {
  const item = startDocumentReview(fixture())[0]!;
  const corrected = correctDocumentField(item, "31.25", "c/kWh", "Flat rate", at);
  assert.equal(corrected.value, 31.25); assert.equal(corrected.proposal.sourceExcerpt, "Usage 30 c/kWh");
  assert.throws(() => correctDocumentField(item, "31.25", "c/day", "", at));
  assert.throws(() => correctDocumentField(startDocumentReview(fixture())[1]!, "2026-02-30", null, "", at));
});
test("rejecting a value clears it; completing every review preserves units without touching assessment state", () => {
  const result = fixture(), items = startDocumentReview(result);
  const reviewed = items.map((item, i) => i === 0 ? acceptDocumentField(item, at) : rejectDocumentField(item, at));
  const snapshot = finishDocumentReview(result, reviewed);
  assert.equal(snapshot.fields[0]?.value, 30); assert.equal(snapshot.fields[0]?.unit, "c/kWh");
  assert.equal(snapshot.fields[1]?.value, null); assert.equal(snapshot.fields[1]?.origin, "unknown");
  assert.equal(result.fields[0]?.value, 30);
});
