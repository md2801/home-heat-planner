import assert from "node:assert/strict";
import { before, after, test } from "node:test";
import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { PGlite } from "@electric-sql/pglite";
import { createPostgresJourneyStore, type JourneyQuery } from "../src/server/journey/postgres.ts";
import { createJourneyService, JourneyError } from "../src/server/journey/service.ts";
import { createJourneyHandlers } from "../src/server/journey/http.ts";
import { assessmentInput, calculationDraft } from "../src/contracts/journey.ts";
import type { AssessmentReceipt, SavedJourney } from "../src/server/journey/types.ts";
import { journeyFixture, answer, at, later, after as observedAt } from "./helpers/journey-fixture.ts";
import { confirmRoomReview, proposedRoomProfile } from "../src/features/room-baseline/model.ts";
import { coolingPlan, togglePlanStep, saveCoolingPlan, chooseCheckIn } from "../src/features/cooling-plan/model.ts";
import { changeStatus, saveCheckIn } from "../src/features/follow-up/model.ts";
import { toggleSimpleAction } from "../src/features/cooling-options/simple-actions.ts";
import { selectCoolingOption } from "../src/features/cooling-options/model.ts";

const db = new PGlite();
const query: JourneyQuery = async (text, parameters) => (await db.query<Record<string, unknown>>(text, parameters)).rows;
const store = createPostgresJourneyStore(query);
const service = createJourneyService(store, () => observedAt);
const handlers = createJourneyHandlers(() => service);
const fixture = journeyFixture();
const input = { schemaVersion: 1 as const, assessment: assessmentInput(fixture.draft) };
before(async () => { await db.exec(await readFile(new URL("../db/migrations/001_journeys.sql", import.meta.url), "utf8")); });
after(async () => { await db.close(); });
function request(method: string, path: string, body?: unknown, token?: string, extra: Record<string, string> = {}) {
  return new Request(`https://planner.example/api/assessments${path}`, { method, headers: { "content-type": "application/json", ...(token ? { authorization: `Bearer ${token}` } : {}), ...extra }, ...(body !== undefined ? { body: typeof body === "string" ? body : JSON.stringify(body) } : {}) });
}
async function create() {
  const response = await handlers.create(request("POST", "", input));
  assert.equal(response.status, 201);
  return await response.json() as AssessmentReceipt & { accessToken: string };
}
async function planned() {
  const receipt = await create();
  assert.equal((await handlers.plan(request("PUT", `/${receipt.assessmentId}/plan`, { assessmentId: receipt.assessmentId, plan: fixture.plan }, receipt.accessToken), receipt.assessmentId)).status, 200);
  return receipt;
}

test("complete HTTP journey survives independent service instances with exact DTOs and window provenance", async () => {
  const { assessmentId: id, accessToken: token } = await planned();
  const saved = await handlers.checkIn(request("POST", `/${id}/check-ins`, { assessmentId: id, checkIn: fixture.checkIn }, token), id);
  assert.deepEqual(await saved.json(), { saved: true, scope: "server" });
  const freshHandlers = createJourneyHandlers(() => createJourneyService(createPostgresJourneyStore(query)));
  const response = await freshHandlers.restore(request("GET", `/${id}`, undefined, token), id);
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("cache-control"), "private, no-store");
  const result = await response.json() as SavedJourney & { assessmentId: string };
  assert.deepEqual(result.assessment, input.assessment);
  assert.deepEqual(result.plan, fixture.plan);
  assert.deepEqual(result.followUp, fixture.checkIn);
  assert.deepEqual(result.checkIns, [fixture.checkIn]);
  assert.equal(result.assessment.answers.window2Orientation?.status, "unknown");
  assert.equal(result.assessment.sceneDetails?.scene.windows?.[1]?.covering, "blinds");
  assert.equal(result.followUp?.actualCostAud.status === "known" && result.followUp.actualCostAud.value, 0);
  const profile = proposedRoomProfile({ ...calculationDraft(result.assessment) }, at);
  assert.equal(profile.confirmedAt.status, "known");
  assert.deepEqual(result.selection, { selectedOption: fixture.draft.selectedOption });
  assert.equal(JSON.stringify(result).includes(token), false);
});

test("IDs alone, URL tokens, malformed tokens and another assessment's token cannot read, change or delete data", async () => {
  const first = await planned(), second = await create();
  const id = first.assessmentId;
  assert.notEqual(first.accessToken, second.accessToken);
  for (const token of [undefined, "bad-token", second.accessToken]) {
    const status = token === second.accessToken ? 404 : 401;
    assert.equal((await handlers.restore(request("GET", `/${id}?accessToken=${first.accessToken}`, undefined, token), id)).status, status);
    assert.equal((await handlers.clear(request("DELETE", `/${id}`, undefined, token), id)).status, status);
    assert.equal((await handlers.plan(request("PUT", `/${id}/plan`, { assessmentId: id, plan: fixture.plan }, token), id)).status, status);
    assert.equal((await handlers.checkIn(request("POST", `/${id}/check-ins`, { assessmentId: id, checkIn: fixture.checkIn }, token), id)).status, status);
    assert.equal((await handlers.create(request("POST", `?assessmentId=${id}`, input, token))).status, status);
  }
  assert.deepEqual((await service.restore(id, first.accessToken)).plan, fixture.plan);
  const rows = await db.query<{ access_token_hash: string; body: string }>("SELECT access_token_hash, document::text AS body FROM heat_planner_journeys WHERE id = $1", [id]);
  assert.equal(rows.rows[0]?.access_token_hash, createHash("sha256").update(first.accessToken).digest("hex"));
  assert.equal(rows.rows[0]?.body.includes(first.accessToken), false);
});

test("existing input guards reject unknown questions, invalid provenance, stale confirmations and extra transport fields", async () => {
  for (const bad of [
    { ...input, unexpected: true },
    { ...input, assessment: { ...input.assessment, answers: { imaginary: { status: "unknown", reason: "unsure" } } } },
    { ...input, assessment: { ...input.assessment, review: { room: { signature: "stale", recordedAt: at } } } },
    { schemaVersion: 1, assessment: { answers: { heatTiming: { status: "known", value: ["afternoon"], provenance: { kind: "measured", recordedAt: at, scope: "wrong", sourceIds: [] } } } } },
  ]) assert.equal((await handlers.create(request("POST", "", bad))).status, 400);
});

test("malformed, oversized, wrong-content-type and cross-origin requests fail without exposing diagnostics", async () => {
  assert.equal((await handlers.create(request("POST", "", "{"))).status, 400);
  assert.equal((await handlers.create(request("POST", "", "x".repeat(128001)))).status, 413);
  assert.equal((await handlers.create(request("POST", "", input, undefined, { "content-type": "text/plain" }))).status, 415);
  assert.equal((await handlers.create(request("POST", "", input, undefined, { origin: "https://foreign.example" }))).status, 403);
  const unavailable = createJourneyHandlers(() => { throw new Error("secret postgres://password@host"); });
  const response = await unavailable.create(request("POST", "", input));
  assert.equal(response.status, 503);
  assert.equal((await response.text()).includes("password"), false);
});

test("plan validation rejects forged finances, evidence, checklist and unrelated assessment IDs", async () => {
  const { assessmentId: id, accessToken: token } = await create();
  const mutated = [
    { ...fixture.plan, upfrontCostAud: { status: "known", value: 100, provenance: { kind: "user-reported", recordedAt: at, sourceIds: [], scope: "invented" } } },
    { ...fixture.plan, evidence: [] },
    { ...fixture.plan, checklist: fixture.plan.checklist.map(c => ({ ...c, description: "unreviewed step" })) },
    { ...fixture.plan, selectedActionId: "ac-replacement" },
  ];
  for (const plan of mutated) assert.equal((await handlers.plan(request("PUT", `/${id}/plan`, { assessmentId: id, plan }, token), id)).status, 400);
  assert.equal((await handlers.plan(request("PUT", `/${id}/plan`, { assessmentId: "another", plan: fixture.plan }, token), id)).status, 400);
  assert.equal((await service.restore(id, token)).plan, null);
});

test("check-ins require a saved matching plan, immutable baselines and observational interpretation", async () => {
  const receipt = await create(), id = receipt.assessmentId, token = receipt.accessToken;
  assert.equal((await handlers.checkIn(request("POST", `/${id}/check-ins`, { assessmentId: id, checkIn: fixture.checkIn }, token), id)).status, 409);
  await service.savePlan(id, token, { assessmentId: id, plan: fixture.plan });
  for (const checkIn of [
    { ...fixture.checkIn, interpretation: "causal" },
    { ...fixture.checkIn, planSignature: "foreign" },
    { ...fixture.checkIn, earlierHoursPerDay: { status: "unknown", reason: "changed baseline" } },
    { ...fixture.checkIn, comfortRating: { status: "known", value: 6, provenance: { kind: "user-reported", recordedAt: at, sourceIds: [], scope: "Cooling plan check-in: comfortRating" } } },
  ]) assert.equal((await handlers.checkIn(request("POST", `/${id}/check-ins`, { assessmentId: id, checkIn }, token), id)).status, 400);
});

test("checklist/date edits keep original snapshots and observations; retries are idempotent", async () => {
  const { assessmentId: id, accessToken: token } = await planned();
  await service.saveCheckIn(id, token, { assessmentId: id, checkIn: fixture.checkIn });
  await service.saveCheckIn(id, token, { assessmentId: id, checkIn: fixture.checkIn });
  const edited = saveCoolingPlan(chooseCheckIn(togglePlanStep(fixture.plan, fixture.plan.checklist[0]!.id, true, observedAt), null, observedAt), observedAt);
  await service.savePlan(id, token, { assessmentId: id, plan: edited });
  const document = await service.restore(id, token);
  assert.equal(document.plan?.checkInDate.status, "unknown");
  assert.equal(document.plan?.checklist[0]?.completed, true);
  assert.equal(document.checkIns.length, 1);
  assert.deepEqual(document.plan?.comparisonSnapshot, fixture.plan.comparisonSnapshot);
  assert.deepEqual(document.followUp, fixture.checkIn);
  await assert.rejects(service.savePlan(id, token, { assessmentId: id, plan: fixture.plan }), (error: unknown) => error instanceof JourneyError && error.status === 409);
});

test("material input edits archive the correct plan and its check-ins, then reject stale saves", async () => {
  const { assessmentId: id, accessToken: token } = await planned();
  await service.saveCheckIn(id, token, { assessmentId: id, checkIn: fixture.checkIn });
  const changed = confirmRoomReview(answer(fixture.draft, "window1Orientation", "east", observedAt), observedAt);
  await service.saveAssessment(id, token, { schemaVersion: 1, assessment: assessmentInput(changed) });
  const document = await service.restore(id, token);
  assert.equal(document.plan, null);
  assert.equal(document.followUp, null);
  assert.deepEqual(document.history[0]?.plan, fixture.plan);
  assert.deepEqual(document.history[0]?.checkIns, [fixture.checkIn]);
  await assert.rejects(service.savePlan(id, token, { assessmentId: id, plan: fixture.plan }), (error: unknown) => error instanceof JourneyError && error.status === 409);
  await assert.rejects(service.saveCheckIn(id, token, { assessmentId: id, checkIn: fixture.checkIn }), (error: unknown) => error instanceof JourneyError && error.status === 409);
});

test("new actions archive earlier plans; simple-only and combined selections use existing plan DTOs", async () => {
  const { assessmentId: id, accessToken: token } = await planned();
  const simpleBase = { ...fixture.draft };
  delete simpleBase.selectedOption;
  const simple = toggleSimpleAction(simpleBase, "reduce-indoor-heat", later);
  const simplePlan = saveCoolingPlan(coolingPlan(simple, later).plan!, observedAt);
  await service.savePlan(id, token, { assessmentId: id, plan: simplePlan });
  let document = await service.restore(id, token);
  assert.equal(document.plan?.comparisonSnapshot.status, "unknown");
  assert.equal(document.plan?.upfrontCostAud.status, "unknown");
  assert.equal(document.history[0]?.plan.id, fixture.plan.id);
  const mixed = selectCoolingOption(simple, "ceiling-insulation", observedAt);
  const mixedPlan = saveCoolingPlan(coolingPlan(mixed, observedAt).plan!, observedAt);
  await service.savePlan(id, token, { assessmentId: id, plan: mixedPlan });
  document = await service.restore(id, token);
  assert.equal(document.history.length, 2);
  assert.deepEqual(document.selection.selectedTechniques, mixed.selectedTechniques);
});

test("concurrent check-ins retry database revisions without losing either observation", async () => {
  const { assessmentId: id, accessToken: token } = await planned();
  const second = saveCheckIn(changeStatus(fixture.checkIn, "started", "2026-10-04T00:03:00.000Z"), "2026-10-04T00:03:00.000Z");
  await Promise.all([service.saveCheckIn(id, token, { assessmentId: id, checkIn: fixture.checkIn }), service.saveCheckIn(id, token, { assessmentId: id, checkIn: second })]);
  const document = await service.restore(id, token);
  assert.equal(document.checkIns.length, 2);
  assert.deepEqual(document.followUp, second);
});

test("database compare-and-swap prevents stale writers resurrecting a deleted journey", async () => {
  const { assessmentId: id, accessToken: token } = await planned();
  const hash = createHash("sha256").update(token).digest("hex");
  const current = (await store.read(id, hash))!;
  assert.equal(await store.replace(id, hash, current.revision + 1, current.document), false);
  assert.deepEqual(await service.clear(id, token), { saved: true, scope: "server" });
  assert.equal(await store.replace(id, hash, current.revision, current.document), false);
  assert.equal(await store.read(id, hash), null);
  assert.equal((await handlers.restore(request("GET", `/${id}`, undefined, token), id)).status, 404);
});

test("checked-in example payloads save and restore through the same guards", async () => {
  const example = async (file: string) => JSON.parse(await readFile(new URL(`../docs/contracts/journey-examples/${file}`, import.meta.url), "utf8"));
  const assessmentExample = await example("assessment-request.json");
  const { assessmentId: id, accessToken: token } = await service.create(assessmentExample);
  assert.ok(token);
  const planExample = await example("plan-request.json");
  await service.savePlan(id, token, { ...planExample, assessmentId: id });
  const checkInExample = await example("check-in-request.json");
  await service.saveCheckIn(id, token, { ...checkInExample, assessmentId: id });
  const restoreExample = await example("restore-response.json");
  assert.deepEqual({ assessmentId: restoreExample.assessmentId, ...await service.restore(id, token) }, restoreExample);
});
