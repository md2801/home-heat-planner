import assert from "node:assert/strict";
import test from "node:test";
import { createBrowserPersistence, type StoragePort } from "../src/lib/persistence/browser-storage.ts";

test("round trip and deletion use the supplied storage boundary", () => {
  const values = new Map<string, string>();
  const storage: StoragePort = { getItem: (key) => values.get(key) ?? null, setItem: (key, value) => { values.set(key, value); }, removeItem: (key) => { values.delete(key); } };
  const persistence = createBrowserPersistence("test", (value): value is string => typeof value === "string", () => storage);
  assert.deepEqual(persistence.load(), { ok: true, value: null });
  assert.equal(persistence.save("test value").ok, true);
  assert.deepEqual(persistence.load(), { ok: true, value: "test value" });
  persistence.remove();
  assert.deepEqual(persistence.load(), { ok: true, value: null });
  values.set("test", "{invalid-json");
  assert.deepEqual(persistence.load(), { ok: false, reason: "invalid-data" });
  values.set("test", "42");
  assert.deepEqual(persistence.load(), { ok: false, reason: "invalid-data" });
});

test("server rendering, blocked storage and quota errors return explicit failures", () => {
  const validate = (value: unknown): value is string => typeof value === "string";
  const unavailable = createBrowserPersistence("test", validate, () => null);
  assert.deepEqual(unavailable.load(), { ok: false, reason: "unavailable" });
  const blocked = createBrowserPersistence("test", validate, () => { throw new Error("Blocked"); });
  assert.deepEqual(blocked.load(), { ok: false, reason: "unavailable" });
  assert.deepEqual(blocked.save("value"), { ok: false, reason: "write-failed" });
  const quota = createBrowserPersistence("test", validate, () => ({ getItem: () => null, setItem: () => { throw new Error("Quota"); }, removeItem: () => { throw new Error("Blocked"); } }));
  assert.deepEqual(quota.save("value"), { ok: false, reason: "write-failed" });
  assert.deepEqual(quota.remove(), { ok: false, reason: "write-failed" });
});
