import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
import { createAccountStore } from "../src/server/account/store.ts";
import { createAccountHandler } from "../src/server/account/http.ts";
import { journeyFixture } from "./helpers/journey-fixture.ts";
import { emptyAssessment } from "../src/features/assessment/state.ts";

async function setup() {
  const db = new PGlite();
  await db.exec(await readFile(new URL("../db/migrations/002_account_journeys.sql", import.meta.url), "utf8"));
  const store = createAccountStore(async (sql, params) => (await db.query<Record<string, unknown>>(sql, params)).rows);
  const handle = createAccountHandler(async request => request.headers.get("test-session"), () => store);
  const request = (method = "GET", user = "homeowner-a", body?: unknown, headers: Record<string, string> = {}) => handle(new Request("https://planner.example/api/account/journey", { method, headers: { "test-session": user, "x-account-user": user, "Content-Type": "application/json", ...headers }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) }));
  return { db, store, request, handle };
}
test("account journeys preserve full plans and are isolated by the verified session", async () => {
  const { db, request } = await setup();
  try {
    const fixture = journeyFixture();
    const draft = { ...fixture.draft, coolingPlanDraft: fixture.plan, followUpCheckIn: fixture.checkIn };
    assert.equal((await request("PUT", "homeowner-a", { draft, revision: 0 })).status, 200);
    const restored = await (await request()).json();
    assert.deepEqual(restored.draft, draft);
    assert.equal(restored.revision, 1);
    assert.deepEqual(await (await request("GET", "homeowner-b")).json(), { draft: null, revision: 0 });
    assert.equal((await request("PUT", "homeowner-b", { draft: emptyAssessment(), revision: 0 })).status, 200);
    assert.deepEqual((await (await request()).json()).draft, draft);
    // A user ID supplied by a client is never an authorization credential.
    assert.equal((await request("GET", "homeowner-a", undefined, { "x-account-user": "homeowner-b" })).status, 401);
    assert.equal((await request("PUT", "homeowner-a", { draft, revision: 1, userId: "homeowner-b" })).status, 400);
  } finally { await db.close(); }
});
test("account saves reject stale versions and reset only the current account", async () => {
  const { db, request } = await setup();
  try {
    const { draft } = journeyFixture();
    await request("PUT", "homeowner-a", { draft, revision: 0 });
    await request("PUT", "homeowner-b", { draft, revision: 0 });
    assert.equal((await request("PUT", "homeowner-a", { draft: emptyAssessment(), revision: 0 })).status, 409);
    assert.equal((await request("PUT", "homeowner-a", { draft: emptyAssessment(), revision: 1 })).status, 200);
    assert.deepEqual((await (await request()).json()).draft, emptyAssessment());
    assert.deepEqual((await (await request("GET", "homeowner-b")).json()).draft, draft);
  } finally { await db.close(); }
});
test("direct access, account switching, invalid bodies, cross-origin writes and failures are handled safely", async () => {
  const { db, request, handle } = await setup();
  try {
    assert.equal((await handle(new Request("https://planner.example/api/account/journey"))).status, 401);
    assert.equal((await request("PUT", "homeowner-b", { draft: emptyAssessment(), revision: 0 }, { "x-account-user": "homeowner-a" })).status, 401);
    assert.equal((await request("PUT", "homeowner-a", { draft: emptyAssessment(), revision: 0 }, { origin: "https://attacker.example" })).status, 403);
    assert.equal((await request("GET", "homeowner-a", undefined, { "sec-fetch-site": "cross-site" })).status, 403);
    assert.equal((await request("PUT", "homeowner-a", { draft: {}, revision: 0 })).status, 400);
    assert.equal((await request("PUT", "homeowner-a", { draft: emptyAssessment(), revision: -1 })).status, 400);
    assert.equal((await request("PUT", "homeowner-a", {}, { "Content-Type": "text/plain" })).status, 415);
    const large = await handle(new Request("https://planner.example/api/account/journey", { method: "PUT", headers: { "test-session": "homeowner-a", "x-account-user": "homeowner-a", "Content-Type": "application/json" }, body: "x".repeat(512001) }));
    assert.equal(large.status, 413);
    const response = await request();
    assert.equal(response.headers.get("cache-control"), "private, no-store");
    assert.equal(response.headers.get("vary"), "Cookie");
    const failure = createAccountHandler(async () => { throw new Error("secret database details"); }, () => { throw new Error(); });
    const failed = await failure(new Request("https://planner.example/api/account/journey"));
    assert.equal(failed.status, 503);
    assert.ok(!(await failed.text()).includes("secret"));
  } finally { await db.close(); }
});
