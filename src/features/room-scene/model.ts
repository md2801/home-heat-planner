import { isRoomScene, type RoomScene } from "../../contracts/room-scene.ts";
export interface SceneRecord { version: 1; scene: RoomScene; confirmedAt: string }
export function isSceneRecord(value: unknown): value is SceneRecord {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const r = value as Record<string, unknown>;
  return Object.keys(r).length === 3 && r.version === 1 && isRoomScene(r.scene) && typeof r.confirmedAt === "string" && Number.isFinite(Date.parse(r.confirmedAt));
}
export function withProposedShade(scene: RoomScene): RoomScene {
  return { ...scene, windows: scene.windows?.map(w => ({ ...w, shade: "awning" })) ?? null };
}
/** Fixed schematic slots prevent overlap. Compass labels are facts, not an inferred floor plan. */
export function windowSlots(count: number) {
  if (!Number.isInteger(count) || count < 0 || count > 4) return [];
  return Array.from({ length: count }, (_, index) => ({ x: 132 + (index + 0.5) * (496 / count) - 44, y: 278, width: 88, height: 100 }));
}
export function sceneUnknowns(scene: RoomScene): string[] {
  return [scene.above === "unknown" ? "what is above the room" : "", scene.bed === "unknown" ? "bed presence" : "", scene.windows === null ? "windows" : "", scene.equipment === null ? "cooling equipment" : "",
    ...(scene.windows ?? []).flatMap((w, i) => [w.direction === "unknown" ? `window ${i + 1} direction` : "", w.covering === "unknown" ? `window ${i + 1} covering` : "", w.shade === "unknown" ? `window ${i + 1} external shade` : ""]),
  ].filter(Boolean);
}
