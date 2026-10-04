import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
import { assessmentInput, calculationDraft } from "../src/contracts/journey.ts";
import { isPlannerCommand } from "../src/contracts/validation.ts";
import type { Comparison, FinancialResult, Provenance } from "../src/domain/models.ts";
import { comparison } from "../src/domain/value-guards.ts";
import { unknown } from "../src/domain/unknown.ts";
import { emptyAssessment, isAssessmentDraft, type AssessmentDraft } from "../src/features/assessment/state.ts";
import { createReferenceShadingScenario } from "../src/features/shading-scenario/model.ts";
import { createBrowserPersistence } from "../src/lib/persistence/browser-storage.ts";
import { createAccountHandler } from "../src/server/account/http.ts";
import { createAccountStore, validAccountDraft } from "../src/server/account/store.ts";

const at = "2026-10-04T00:00:00.000Z";
function fixture(): AssessmentDraft {
  return { ...emptyAssessment(), shadingScenario: { input: createReferenceShadingScenario({ updatedAt: at }), roomSignature: "room-test" } };
}
const command = (draft: AssessmentDraft) => ({ schemaVersion: 1, operation: "compare", assessment: assessmentInput(draft) });

test("legacy assessment and calculation payloads remain valid without a shading scenario", () => {
  const draft = emptyAssessment();
  assert.equal(isAssessmentDraft(draft), true);
  assert.equal(validAccountDraft(draft), true);
  assert.equal(isPlannerCommand(command(draft)), true);
  assert.deepEqual(assessmentInput(draft), { answers: {} });
  assert.equal(Object.hasOwn(calculationDraft(assessmentInput(draft)), "shadingScenario"), false);
});

test("shading assumptions survive browser and calculation DTO round trips", () => {
  const draft = fixture();
  const data = new Map<string, string>();
  const storage = createBrowserPersistence("shading-contract", isAssessmentDraft, () => ({ getItem: key => data.get(key) ?? null, setItem: (key, value) => { data.set(key, value); }, removeItem: key => { data.delete(key); } }));
  assert.equal(storage.save(draft).ok, true);
  assert.deepEqual(storage.load(), { ok: true, value: draft });
  assert.equal(isPlannerCommand(command(draft)), true);
  assert.deepEqual(calculationDraft(JSON.parse(JSON.stringify(assessmentInput(draft)))).shadingScenario, draft.shadingScenario);
});

test("malformed shading payloads and extra transport fields are rejected", () => {
  const draft = fixture();
  for (const shadingScenario of [null, {}, { ...draft.shadingScenario, roomSignature: "" }, { ...draft.shadingScenario, extra: true }, { ...draft.shadingScenario, input: { ...draft.shadingScenario!.input, extra: true } }]) {
    const invalid = { ...draft, shadingScenario };
    assert.equal(isAssessmentDraft(invalid), false);
    assert.equal(validAccountDraft(invalid), false);
    assert.equal(isPlannerCommand({ ...command(draft), assessment: { ...assessmentInput(draft), shadingScenario } }), false);
  }
  assert.equal(isPlannerCommand({ ...command(draft), assessment: { ...assessmentInput(draft), inventedSavings: 200 } }), false);
  assert.equal(validAccountDraft({ ...draft, inventedSavings: 200 }), false);
});

test("account API stores and restores the full shading scenario without a schema migration", async () => {
  const db = new PGlite();
  try {
    await db.exec(await readFile(new URL("../db/migrations/002_account_journeys.sql", import.meta.url), "utf8"));
    const store = createAccountStore(async (sql, params) => (await db.query<Record<string, unknown>>(sql, params)).rows);
    const handle = createAccountHandler(async () => "shading-user", () => store);
    const request = (method: string, body?: unknown) => new Request("https://planner.example/api/account/journey", { method, headers: { "x-account-user": "shading-user", "content-type": "application/json" }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
    const draft = fixture();
    assert.equal((await handle(request("PUT", { draft, revision: 0 }))).status, 200);
    const restored = await (await handle(request("GET"))).json();
    assert.deepEqual(restored.draft.shadingScenario, draft.shadingScenario);
    assert.equal(restored.revision, 1);
    assert.equal((await handle(request("PUT", { draft: { ...draft, shadingScenario: { ...draft.shadingScenario, roomSignature: "" } }, revision: 1 }))).status, 400);
    assert.deepEqual((await store.load("shading-user")).draft, draft);
  } finally { await db.close(); }
});

const provenance: Provenance = { kind: "assumed", recordedAt: at, sourceIds: [], scope: "Test stated-period scenario" };
function financial(amount: number | null): FinancialResult {
  return { status: amount === null ? "insufficient-evidence" : "what-if", amountAud: amount === null ? unknown("Annual savings are not established") : { status: "known", value: amount, provenance }, currency: "AUD", period: { status: "known", value: { kind: "cooling-schedule", coolingDays: 7, basis: "stated-period", description: "Seven example cooling days" }, provenance }, methodVersion: "test-scenario-v1", inputProvenance: [provenance], assumptions: [], sourceIds: [], limitations: [] };
}
function comparisonFixture(): Comparison {
  return { optionId: "external-shading", baseline: financial(20), proposed: financial(15), annualNetSavings: { ...financial(null), period: unknown("No annual period") }, periodSavings: financial(5), energySavingsKwh: { status: "known", value: 10, provenance }, simplePaybackYears: unknown("No annual savings"), assumptions: [] };
}

test("selected-period savings remain distinct from unavailable annual savings after transport", () => {
  const value = JSON.parse(JSON.stringify(comparisonFixture())) as Comparison;
  assert.equal(comparison(value), true);
  assert.equal(value.periodSavings!.amountAud.status, "known");
  assert.equal(value.annualNetSavings.amountAud.status, "unknown");
  assert.equal(value.simplePaybackYears.status, "unknown");
  const legacy = { ...value };
  delete legacy.periodSavings;
  delete legacy.energySavingsKwh;
  assert.equal(comparison(legacy), true);
});

test("comparison guards reject malformed optional savings while preserving known zero", () => {
  const value = comparisonFixture();
  assert.equal(comparison({ ...value, periodSavings: {} }), false);
  assert.equal(comparison({ ...value, periodSavings: { ...value.periodSavings, amountAud: { status: "known", value: "5", provenance } } }), false);
  for (const invalid of [null, 10, { status: "known", value: Number.NaN, provenance }, { status: "known", value: { min: 1, max: 2 }, provenance }]) {
    assert.equal(comparison({ ...value, energySavingsKwh: invalid }), false);
  }
  assert.equal(comparison({ ...value, energySavingsKwh: { status: "known", value: 0, provenance } }), true);
});
