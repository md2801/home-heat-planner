import type { AssessmentAnswers, Direction } from "../../domain/models.ts";
import { questions } from "../assessment/questions.ts";

export interface EquipmentPlacement {
  fanPosition?: "beside-bed" | "foot-of-bed" | "near-window" | "near-door" | "elsewhere";
  acType?: "wall-mounted" | "window-mounted" | "portable" | "ducted" | "other";
  acWall?: Direction;
}
const valueOf = (a: AssessmentAnswers, id: string) => a[id]?.status === "known" ? a[id].value : undefined;
/** Input has already passed assessment validation; inactive details never reach the drawing. */
export function equipmentPlacement(answers: AssessmentAnswers): EquipmentPlacement {
  const result: EquipmentPlacement = {};
  const cooling = valueOf(answers, "cooling");
  if (!Array.isArray(cooling)) return result;
  if (cooling.includes("fan") && ["portable", "both"].includes(String(valueOf(answers, "fanType")))) {
    const position = valueOf(answers, "portableFanPosition");
    if (typeof position === "string") result.fanPosition = position as NonNullable<EquipmentPlacement["fanPosition"]>;
  }
  if (cooling.includes("air-conditioner")) {
    const type = valueOf(answers, "acType");
    if (typeof type === "string") result.acType = type as NonNullable<EquipmentPlacement["acType"]>;
    const wall = valueOf(answers, "acWall");
    if ((type === "wall-mounted" || type === "window-mounted") && typeof wall === "string") result.acWall = wall as Direction;
  }
  return result;
}
export function equipmentDetailText(answers: AssessmentAnswers, equipment: "fan" | "air-conditioner"): string {
  const cooling = valueOf(answers, "cooling");
  if (!Array.isArray(cooling)) return "Not sure";
  if (!cooling.includes(equipment)) return "Not reported";
  const ids = equipment === "fan" ? ["fanType", ...(["portable", "both"].includes(String(valueOf(answers, "fanType"))) ? ["portableFanPosition"] : [])] : ["acType", ...(["wall-mounted", "window-mounted"].includes(String(valueOf(answers, "acType"))) ? ["acWall"] : [])];
  return ids.map(id => questions.find(q => q.id === id)?.choices?.find(c => c.value === valueOf(answers, id))?.label ?? "Not sure").join(" · ");
}
