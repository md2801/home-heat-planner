import { test } from "node:test";
import assert from "node:assert/strict";
import { filterTechniques, reviewedOn, sources, techniques } from "../src/features/knowledge-base/catalogue.ts";

test("the curated library has at least ten distinct, sourced, actionable techniques", () => {
  assert.ok(techniques.length >= 10);
  assert.equal(new Set(techniques.map(item => item.id)).size, techniques.length);
  assert.match(reviewedOn, /^\d{4}-\d{2}-\d{2}$/);
  for (const item of techniques) {
    assert.ok(item.steps.length && item.checks.length && item.benefit && item.sourceIds.length, item.id);
    for (const id of item.sourceIds) {
      const url = new URL(sources[id].url);
      assert.equal(url.protocol, "https:");
      assert.ok(["www.energy.gov.au", "www.yourhome.gov.au"].includes(url.hostname));
    }
  }
});

test("search finds step and suitability information regardless of case and extra spaces", () => {
  assert.ok(filterTechniques("  GAS   HEATERS ", "all", "all").some(item => item.id === "draught-seals"));
  assert.deepEqual(filterTechniques(" ", "all", "all"), techniques);
  assert.deepEqual(filterTechniques("unfindable-technique", "all", "all"), []);
});

test("focus, effort and query combine without dropping or changing the original guidance", () => {
  const before = structuredClone(techniques);
  const matches = filterTechniques("windows", "heat-out", "habit");
  assert.deepEqual(matches.map(item => item.id), ["close-curtains"]);
  assert.ok(filterTechniques("", "cooling", "habit").length > 0);
  assert.deepEqual(filterTechniques("", "everyday", "plan-ahead"), []);
  assert.deepEqual(techniques, before);
});
