import test from "node:test";
import assert from "node:assert/strict";
import { emptyScene, isRoomScene, isSceneRequest, type RoomScene } from "../src/contracts/room-scene.ts";
import { isSceneRecord, sceneUnknowns, windowSlots, withProposedShade } from "../src/features/room-scene/model.ts";
import { generateRoomScene } from "../src/server/room-scene.ts";
import { createBrowserPersistence } from "../src/lib/persistence/browser-storage.ts";

const scene: RoomScene = { ...emptyScene(), bed: "present", windows: [{ direction: "west", shade: "none", covering: "curtains" }], equipment: ["split-ac"] };
test("scene rejects executable/extra fields, invalid enums, duplicate equipment and excess windows", () => {
  assert.equal(isRoomScene(scene), true);
  for (const invalid of [{ ...scene, html: "<script>bad</script>" }, { ...scene, bed: true }, { ...scene, equipment: ["split-ac", "split-ac"] }, { ...scene, windows: Array(5).fill(scene.windows![0]) }, { ...scene, windows: [{ ...scene.windows![0], x: 999 }] }]) assert.equal(isRoomScene(invalid), false);
  assert.equal(isSceneRequest({ description: "two windows", current: scene }), true);
  assert.equal(isSceneRequest({ description: "x".repeat(1001), current: scene }), false);
  assert.equal(isSceneRequest({ description: " ", current: scene }), false);
});
test("unknown and absent are different; shading preview never changes the original", () => {
  assert.ok(sceneUnknowns(emptyScene()).includes("windows"));
  assert.ok(!sceneUnknowns({ ...emptyScene(), windows: [], equipment: [] }).includes("windows"));
  const proposed = withProposedShade(scene);
  assert.equal(proposed.windows![0]!.shade, "awning");
  assert.equal(scene.windows![0]!.shade, "none");
  assert.deepEqual(proposed.equipment, scene.equipment);
  assert.equal(withProposedShade(emptyScene()).windows, null);
});
test("all supported window counts fit in deterministic nonoverlapping slots", () => {
  for (let n = 1; n <= 4; n++) {
    const slots = windowSlots(n);
    assert.equal(slots.length, n);
    slots.forEach((s, i) => { assert.ok(s.x >= 120 && s.x + s.width <= 640); if (i > 0) assert.ok(slots[i - 1]!.x + slots[i - 1]!.width < s.x); });
  }
  assert.deepEqual(windowSlots(5), []);
});
test("confirmed scenes survive storage, invalid records are rejected and deletion works", () => {
  const values = new Map<string, string>();
  const store = createBrowserPersistence("scene", isSceneRecord, () => ({ getItem: k => values.get(k) ?? null, setItem: (k, v) => { values.set(k, v); }, removeItem: k => { values.delete(k); } }));
  const record = { version: 1 as const, scene, confirmedAt: "2026-10-03T01:00:00Z" };
  assert.ok(store.save(record).ok); assert.deepEqual(store.load(), { ok: true, value: record });
  values.set("scene", JSON.stringify({ ...record, scene: { ...scene, savings: 100 } }));
  assert.equal(store.load().ok, false); assert.ok(store.remove().ok); assert.deepEqual(store.load(), { ok: true, value: null });
});
test("provider schema output is validated, failures preserve manual path, local limit and deployment guard apply", async () => {
  // Synthetic credentials in this isolated test process; no environment file is loaded or inspected.
  process.env.OPEN_AI_KEY = "synthetic-test-only";
  delete process.env.VERCEL;
  let calls = 0;
  const provider: typeof fetch = async (_url, init) => {
    calls++;
    const body = JSON.parse(String(init?.body));
    assert.equal(body.model, "gpt-6-luna"); assert.equal(body.store, false); assert.equal(body.text.format.strict, true);
    return Response.json({ status: "completed", output: [{ content: [{ type: "output_text", text: JSON.stringify(scene) }] }] });
  };
  const input = { description: "Synthetic bedroom fixture", current: emptyScene() };
  assert.deepEqual(await generateRoomScene(input, "fixture", provider), { ok: true, scene });
  const invalid: typeof fetch = async () => Response.json({ output: [{ content: [{ type: "output_text", text: JSON.stringify({ ...scene, cost: 100 }) }] }] });
  assert.equal((await generateRoomScene(input, "fixture", invalid)).ok, false);
  assert.equal((await generateRoomScene(input, "fixture", async () => { throw new Error("fake"); })).ok, false);
  assert.equal((await generateRoomScene(input, "fixture", provider)).ok, false);
  assert.equal(calls, 1);
  process.env.VERCEL = "1"; delete process.env.AI_DISTRIBUTED_LIMITS_CONFIRMED;
  assert.equal((await generateRoomScene(input, "prod", provider)).ok, false);
  delete process.env.OPEN_AI_KEY;
});
