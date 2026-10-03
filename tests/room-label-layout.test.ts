import test from "node:test";
import assert from "node:assert/strict";
import { overlaps, placeRoomLabel } from "../src/features/room-scene/room-label-layout.ts";
import { roomLayout } from "../src/features/room-scene/room-layout.ts";
import { emptyScene } from "../src/contracts/room-scene.ts";

test("annotations remain inside the view at every edge", () => {
  for (const anchor of [{ x: 0, y: 0 }, { x: 640, y: 0 }, { x: 0, y: 420 }, { x: 640, y: 420 }]) {
    const rect = placeRoomLabel(anchor, { width: 130, height: 30 }, { width: 640, height: 420 }, [], { x: anchor.x - 320, y: anchor.y - 210 });
    assert.ok(rect);
    assert.ok(rect.x >= 8 && rect.y >= 8 && rect.x + rect.width <= 632 && rect.y + rect.height <= 412);
  }
});
test("crowded annotations avoid the bed and previously placed labels", () => {
  const occupied = [{ x: 180, y: 140, width: 260, height: 160 }];
  for (let i = 0; i < 6; i++) {
    const rect = placeRoomLabel({ x: 320, y: 140 }, { width: 120, height: 30 }, { width: 640, height: 420 }, occupied, { x: 0, y: -1 });
    assert.ok(rect);
    assert.ok(occupied.every(other => !overlaps(rect, other)));
    occupied.push(rect);
  }
});
test("annotations without safe space are omitted rather than overlapping", () => {
  assert.equal(placeRoomLabel({ x: 50, y: 50 }, { width: 80, height: 30 }, { width: 100, height: 100 }, [{ x: 0, y: 0, width: 100, height: 100 }], { x: 1, y: 0 }), null);
});
test("AC annotation retains a diagonal reported bearing even on a schematic cardinal wall", () => {
  const layout = roomLayout({ ...emptyScene(), equipment: ["split-ac"] }, { acType: "wall-mounted", acWall: "north-east" });
  assert.equal(layout.equipment[0]?.wall, "north");
  assert.equal(layout.equipment[0]?.direction, "north-east");
});
