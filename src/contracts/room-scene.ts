/** Scene facts only: no code, coordinates, dimensions or thermal predictions from the model. */
export const directions = ["unknown", "north", "north-east", "east", "south-east", "south", "south-west", "west", "north-west"] as const;
export const coverings = ["unknown", "none", "curtains", "blinds", "shutters"] as const;
export const shades = ["unknown", "none", "awning", "present-unspecified"] as const;
export const equipmentTypes = ["split-ac", "ceiling-fan", "portable-fan", "ac-unspecified", "fan-unspecified"] as const;
export interface SceneWindow {
  direction: typeof directions[number];
  covering: typeof coverings[number];
  shade: typeof shades[number];
}
export interface RoomScene {
  version: 1;
  above: "unknown" | "roof" | "another-room" | "another-dwelling";
  bed: "unknown" | "present" | "absent";
  /** null means unknown; [] means explicitly none. Maximum four windows in this prototype. */
  windows: SceneWindow[] | null;
  equipment: (typeof equipmentTypes[number])[] | null;
}
export const emptyScene = (): RoomScene => ({ version: 1, above: "unknown", bed: "unknown", windows: null, equipment: null });
const object = (v: unknown): v is Record<string, unknown> => !!v && typeof v === "object" && !Array.isArray(v);
const exact = (v: Record<string, unknown>, keys: string[]) => Object.keys(v).length === keys.length && keys.every(k => Object.hasOwn(v, k));
const member = (values: readonly string[], value: unknown) => typeof value === "string" && values.includes(value);
export function isRoomScene(value: unknown): value is RoomScene {
  if (!object(value) || !exact(value, ["version", "above", "bed", "windows", "equipment"])) return false;
  return value.version === 1 && member(["unknown", "roof", "another-room", "another-dwelling"], value.above)
    && member(["unknown", "present", "absent"], value.bed)
    && (value.windows === null || (Array.isArray(value.windows) && value.windows.length <= 4 && value.windows.every(w => object(w) && exact(w, ["direction", "covering", "shade"]) && member(directions, w.direction) && member(coverings, w.covering) && member(shades, w.shade))))
    && (value.equipment === null || (Array.isArray(value.equipment) && value.equipment.length <= 3 && new Set(value.equipment).size === value.equipment.length && value.equipment.every(e => member(equipmentTypes, e)) && !(value.equipment.includes("ac-unspecified") && value.equipment.includes("split-ac")) && !(value.equipment.includes("fan-unspecified") && (value.equipment.includes("ceiling-fan") || value.equipment.includes("portable-fan")))));
}
export interface SceneRequest { description: string; current: RoomScene }
export function isSceneRequest(value: unknown): value is SceneRequest {
  return object(value) && exact(value, ["description", "current"]) && typeof value.description === "string" && value.description.trim().length > 0 && value.description.length <= 1000 && isRoomScene(value.current);
}
export type SceneResponse = { ok: true; scene: RoomScene } | { ok: false; message: string };
const enumSchema = (values: readonly string[]) => ({ type: "string", enum: values });
export const roomSceneSchema = {
  type: "object", additionalProperties: false, required: ["version", "above", "bed", "windows", "equipment"],
  properties: {
    version: { type: "integer", enum: [1] }, above: enumSchema(["unknown", "roof", "another-room", "another-dwelling"]), bed: enumSchema(["unknown", "present", "absent"]),
    windows: { anyOf: [{ type: "null" }, { type: "array", maxItems: 4, items: { type: "object", additionalProperties: false, required: ["direction", "covering", "shade"], properties: { direction: enumSchema(directions), covering: enumSchema(coverings), shade: enumSchema(shades) } } }] },
    equipment: { anyOf: [{ type: "null" }, { type: "array", maxItems: 3, items: enumSchema(equipmentTypes) }] },
  },
};
