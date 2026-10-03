import type { RoomScene, SceneWindow } from "../../contracts/room-scene.ts";
import type { EquipmentPlacement } from "./equipment-details.ts";
export type Wall = "north" | "east" | "south" | "west";
export type Point = [number, number, number];
export interface PlacedWindow extends SceneWindow { id: string; wall: Wall; offset: number; scale: number }
export interface PlacedAsset { id: string; asset: string; position: Point; rotation: number; wall?: Wall; direction?: SceneWindow["direction"] }
export interface RoomLayout { windows: PlacedWindow[]; equipment: PlacedAsset[]; notes: string[]; reported: string[]; bed: boolean; above: RoomScene["above"] }
export const wallWidths: Record<Wall, number> = { north: 4.5, south: 4.5, east: 4.2, west: 4.2 };
export const wallRotation: Record<Wall, number> = { north: 0, east: -Math.PI / 2, south: Math.PI, west: Math.PI / 2 };
/** A four-wall schematic cannot reconstruct non-orthogonal bearings. Preserve the reported label. */
export function directionWall(direction: SceneWindow["direction"]): Wall | null {
  if (direction === "unknown") return null;
  if (direction === "north-east" || direction === "north-west") return "north";
  if (direction === "south-east" || direction === "south-west") return "south";
  return direction;
}
export function wallPoint(wall: Wall, offset: number, height: number, inset = 0): Point {
  if (wall === "north") return [offset, height, -2.1 + inset];
  if (wall === "east") return [2.25 - inset, height, offset];
  if (wall === "south") return [-offset, height, 2.1 - inset];
  return [-2.25 + inset, height, -offset];
}
export function visibleWalls(x: number, z: number): Wall[] { return [x >= 0 ? "west" : "east", z >= 0 ? "north" : "south"]; }
export function roomLayout(scene: RoomScene, placement: EquipmentPlacement = {}): RoomLayout {
  const windows: PlacedWindow[] = [], equipment: PlacedAsset[] = [], notes: string[] = [], reported: string[] = [];
  if (scene.windows === null) notes.push("Window count not confirmed; no window positions assumed.");
  if (scene.windows?.length === 0) reported.push("No windows reported");
  for (const [index, w] of (scene.windows ?? []).entries()) {
    const wall = directionWall(w.direction);
    reported.push(`Window ${index + 1}: ${w.direction}; ${w.covering === "unknown" ? "covering unconfirmed" : w.covering}; ${w.shade === "unknown" ? "shade unconfirmed" : w.shade === "none" ? "no external shade" : w.shade === "awning" ? "awning" : "shade present, type unconfirmed"}`);
    if (!wall) { notes.push(`Window ${index + 1}: direction unconfirmed; not placed on a wall.`); continue; }
    if (w.direction.includes("-")) notes.push(`Window ${index + 1}: ${w.direction} is placed approximately on the ${wall} side of this four-wall schematic.`);
    windows.push({ ...w, id: `window-${index + 1}`, wall, offset: 0, scale: 1 });
  }
  for (const wall of ["north", "east", "south", "west"] as const) {
    const matching = windows.filter(w => w.wall === wall);
    matching.forEach((w, i) => { w.scale = Math.min(1, (wallWidths[wall] - .5) / (matching.length * 1.8)); w.offset = (i - (matching.length - 1) / 2) * (wallWidths[wall] - .5) / matching.length; });
  }
  const add = (id: string, asset: string, position: Point, wall?: Wall, direction?: SceneWindow["direction"]) => equipment.push({ id, asset, position, rotation: wall ? wallRotation[wall] : 0, ...(wall ? { wall } : {}), ...(direction ? { direction } : {}) });
  const eq = scene.equipment ?? [];
  if (scene.equipment === null) notes.push("Cooling equipment not confirmed.");
  if (eq.includes("fan-unspecified")) notes.push("Fan reported; type and position not confirmed.");
  if (eq.includes("ceiling-fan")) { add("ceiling-fan", "ceiling-fan", [0, 2.30, 0]); reported.push("Ceiling fan · centred illustratively"); }
  if (eq.includes("portable-fan")) {
    const p = placement.fanPosition;
    let point: Point | undefined;
    if (p === "beside-bed") point = [1.25, .04, .2];
    if (p === "foot-of-bed") point = [0, .04, 1.60];
    if (p === "near-window" && windows[0]) { const w = windows[0]; point = wallPoint(w.wall, w.offset, .04, .65); }
    if (p === "near-door" || p === "elsewhere") notes.push(`Fan: ${p}; exact location ${p === "near-door" ? "and door position " : ""}not confirmed.`);
    if (point) { add("portable-fan", "pedestal-fan", point); reported.push(`Portable fan · ${p}`); if (p === "near-window" && windows.length > 1) notes.push("Fan shown near the first known window; which window is not confirmed."); }
    else if (p !== "near-door" && p !== "elsewhere") notes.push(p === "near-window" ? "Fan near a window; window position not yet confirmed." : "Portable fan position not confirmed; not placed.");
  }
  if (eq.some(e => e.includes("ac"))) {
    const type = placement.acType ?? (eq.includes("split-ac") ? "wall-mounted" : undefined);
    const wall = placement.acWall ? directionWall(placement.acWall) : null;
    if ((type === "wall-mounted" || type === "window-mounted") && wall) {
      add("ac", type === "wall-mounted" ? "split-ac" : "window-ac", wallPoint(wall, 0, type === "wall-mounted" ? 2.35 : 1.70, .14), wall, placement.acWall);
      reported.push(`AC · ${type} · ${placement.acWall}`);
      if (placement.acWall?.includes("-")) notes.push(`AC ${placement.acWall} shown approximately on the ${wall} side.`);
      if (type === "window-mounted") notes.push("Window/wall AC position is illustrative; its mounting opening is not confirmed.");
    } else if (type === "ducted") { add("ac", "vent", [.7, 2.77, .3]); reported.push("Ducted vent · ceiling position illustrative"); }
    else notes.push(type === "portable" ? "Portable AC reported; its location has not been collected." : type === "wall-mounted" || type === "window-mounted" ? "AC wall not confirmed; unit not placed." : "AC reported; type not confirmed.");
  }
  if (scene.bed === "unknown") notes.push("Bed and furnishings are illustrative; their presence and positions are unconfirmed.");
  return { windows, equipment, notes, reported, bed: scene.bed !== "absent", above: scene.above };
}
