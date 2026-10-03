import { test } from "node:test";
import assert from "node:assert/strict";
import { emptyReplacement, isReplacementInputs } from "../src/features/cooling-options/replacement.ts";
import { resumeReplacementStep, stepFields } from "../src/features/cooling-options/replacement-guide.ts";
import { materialSignature } from "../src/domain/material-signature.ts";
import { emptyAssessment, isAssessmentDraft } from "../src/features/assessment/state.ts";
import { createAssessmentRepository } from "../src/features/assessment/repository.ts";
import { createBrowserPersistence } from "../src/lib/persistence/browser-storage.ts";
const at = "2026-10-03T01:00:00Z";

test("guide progress accepts legacy drafts and only valid optional steps", () => {
  const input = emptyReplacement(at);
  assert.equal(isReplacementInputs(input), true);
  for (const step of [0, 1, 2, 3]) assert.equal(isReplacementInputs({ ...input, step }), true);
  for (const step of [-1, 4, 1.5, "2", null]) assert.equal(isReplacementInputs({ ...input, step }), false);
});
test("legacy comparisons resume at their first missing section without filling values", () => {
  assert.equal(resumeReplacementStep(undefined), 0);
  const input = emptyReplacement(at);
  assert.equal(resumeReplacementStep(input), 0);
  stepFields.forEach((fields, index) => {
    fields.forEach(field => { input.fields[field] = "supplied"; });
    assert.equal(resumeReplacementStep(input), index + 1);
  });
  input.fields.existingSource = "  ";
  assert.equal(resumeReplacementStep(input), 0);
  const before = structuredClone(input);
  assert.equal(resumeReplacementStep({ ...input, step: 3 }), 3);
  assert.deepEqual(input, before);
});
test("saved step survives repository reload without changing material financial inputs", () => {
  const memory = new Map<string, string>();
  const persistence = createBrowserPersistence("guided-comparison-test", isAssessmentDraft, () => ({ getItem: key => memory.get(key) ?? null, setItem: (key, value) => { memory.set(key, value); }, removeItem: key => { memory.delete(key); } }));
  const draft = { ...emptyAssessment(), replacement: { ...emptyReplacement(at), fields: { existingModel: "Synthetic indoor/outdoor pair" }, step: 1 as const } };
  const repo = createAssessmentRepository(persistence);
  repo.save(draft);
  const resumed = createAssessmentRepository(persistence);
  resumed.hydrate();
  assert.equal(resumeReplacementStep(resumed.getSnapshot().draft.replacement), 1);
  assert.equal(resumed.getSnapshot().draft.replacement?.fields.existingModel, "Synthetic indoor/outdoor pair");
  assert.equal(materialSignature(draft), materialSignature({ ...draft, replacement: { ...draft.replacement, step: 3 } }));
});
