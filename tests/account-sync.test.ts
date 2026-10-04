import { test } from "node:test";
import assert from "node:assert/strict";
import { createAssessmentRepository } from "../src/features/assessment/repository.ts";
import { createAccountCache, createAccountSync, AccountSyncError, type SyncState } from "../src/features/account/sync.ts";
import { journeyFixture } from "./helpers/journey-fixture.ts";
import { emptyAssessment } from "../src/features/assessment/state.ts";
function memory() {
  const entries = new Map<string, string>();
  return { getItem: (key: string) => entries.get(key) ?? null, setItem: (key: string, value: string) => { entries.set(key, value); }, removeItem: (key: string) => { entries.delete(key); } };
}
test("device caches never reuse another account's assessment", () => {
  const storage = memory();
  const a = createAccountCache("user-a", () => storage);
  a.persistence.save(journeyFixture().draft);
  const b = createAccountCache("user-b", () => storage);
  const repo = createAssessmentRepository(a.persistence); repo.hydrate();
  assert.ok(Object.keys(repo.getSnapshot().draft.answers).length > 0);
  repo.switchPersistence(b.persistence);
  assert.deepEqual(repo.getSnapshot().draft, emptyAssessment());
  assert.equal(repo.getSnapshot().draft.history, undefined);
});
test("offline edits survive reload and retry, including clearing an account", async () => {
  const storage = memory();
  let cache = createAccountCache("a", () => storage);
  let repo = createAssessmentRepository(cache.persistence); repo.hydrate();
  let state: SyncState | null = null;
  let connected = false;
  const draft = journeyFixture().draft;
  const engine = createAccountSync(repo, cache, { async load() { return { draft: null, revision: 0 }; }, async save() { if (!connected) throw new Error("offline"); return 1; } }, value => { state = value; });
  await engine.start(); repo.save(draft); await engine.flush();
  assert.equal(state!.phase, "offline");
  engine.stop();
  cache = createAccountCache("a", () => storage);
  repo = createAssessmentRepository(cache.persistence); repo.hydrate();
  assert.deepEqual(repo.getSnapshot().draft, draft);
  connected = true;
  const sent: unknown[] = [];
  const resumed = createAccountSync(repo, cache, { async load() { return { draft: null, revision: 0 }; }, async save(value, revision) { sent.push(value); return revision + 1; } }, value => { state = value; });
  await resumed.start(); assert.deepEqual(sent[0], draft); assert.equal(cache.get().dirty, false);
  repo.clear(); await resumed.flush(); assert.deepEqual(sent[1], emptyAssessment());
  resumed.stop();
});
test("newer remote revisions require a choice and never silently discard device progress", async () => {
  const storage = memory(); const cache = createAccountCache("a", () => storage);
  const draft = journeyFixture().draft;
  cache.baseline(emptyAssessment(), 1); cache.persistence.save(draft);
  const repo = createAssessmentRepository(cache.persistence); repo.hydrate();
  let state: SyncState | null = null, writes = 0;
  const engine = createAccountSync(repo, cache, { async load() { return { draft: emptyAssessment(), revision: 2 }; }, async save(_, revision) { writes++; assert.equal(revision, 2); return 3; } }, value => { state = value; });
  await engine.start(); assert.equal(state!.phase, "conflict"); assert.deepEqual(repo.getSnapshot().draft, draft); assert.equal(writes, 0);
  await engine.resolve("device"); assert.equal(writes, 1); assert.equal(cache.get().revision, 3);
  engine.stop();
});
test("a concurrent server save pauses autosaving and a late response cannot restore a signed-out account", async () => {
  const cache = createAccountCache("a", () => memory());
  const repo = createAssessmentRepository(cache.persistence); repo.hydrate();
  let state: SyncState | null = null;
  const engine = createAccountSync(repo, cache, { async load() { return { draft: null, revision: 0 }; }, async save() { throw new AccountSyncError(409); } }, value => { state = value; });
  await engine.start(); repo.save(journeyFixture().draft); await engine.flush(); assert.equal(state!.phase, "conflict");
  engine.stop();
  let resolve!: (value: { draft: ReturnType<typeof emptyAssessment>; revision: number }) => void;
  const pending = new Promise<{ draft: ReturnType<typeof emptyAssessment>; revision: number }>(done => { resolve = done; });
  const late = createAccountSync(repo, cache, { load: () => pending, async save() { return 1; } }, () => { throw new Error("A stopped engine cannot update the account state"); });
  // Start reports before it is stopped; suppress only that expected report in this test.
  late.stop(); const restore = late.start(); resolve({ draft: emptyAssessment(), revision: 1 }); await restore;
  assert.ok(Object.keys(repo.getSnapshot().draft.answers).length > 0);
});
