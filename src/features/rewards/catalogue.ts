import type { AssessmentDraft } from "../assessment/state.ts";
import { availableSimpleActions, selectedSimpleActions } from "../cooling-options/simple-actions.ts";
import { coolingOptions } from "../cooling-options/model.ts";

export const rewardCatalogueVersion = "home-rewards-v1";
export interface RewardTask { id: string; title: string; detail: string; coins: number; photoCount: 1 | 2; proof: string; criteria: string; checks: readonly string[]; inPlan: boolean }
const proofRules: Record<string, { coins: number; photoCount: 1 | 2; proof: string; criteria: string }> = {
  "close-curtains": { coins: 100, photoCount: 1, proof: "Show your existing curtains or blinds closed across the window.", criteria: "A real household window with curtains, blinds or shutters visibly closed across its glass. Assess the visible setup only; do not infer the time of day or a continuing habit." },
  "fans": { coins: 100, photoCount: 1, proof: "Show an existing fan safely placed near the area you use. Keep people out of the photo.", criteria: "A real fan positioned to serve a sitting or sleeping area, with unobstructed airflow. A product listing or boxed fan is insufficient. Do not infer that it is running or an energy saving." },
  "comfortable-setting": { coins: 100, photoCount: 2, proof: "Only if comfortable and safe for you: show the same AC control in cooling mode before and after a small increase in its setting. Both temperatures must be readable. Otherwise skip this task.", criteria: "Two real photos of the same identifiable AC controller in cooling mode, with readable Celsius settings and the after setting higher than the before setting. Do not infer personal comfort, safety of a particular temperature or an ongoing habit. Unreadable settings or mode are insufficient." },
  "cool-used-rooms": { coins: 100, photoCount: 1, proof: "Show the closed bedroom door and your refrigerated AC setup in the same room.", criteria: "A real room with a visibly closed interior door and identifiable refrigerated AC equipment in the same scene. Do not infer occupancy, equipment operation or savings." },
  "clean-filters": { coins: 150, photoCount: 2, proof: "Show the same accessible AC filter before and after cleaning, following the manufacturer's instructions.", criteria: "Two real photos visibly show the same accessible AC filter before and after cleaning, with a visible reduction of dust or debris. A single clean filter does not show completion; identical photos, dissimilar filters, diagrams and repairs to wiring or refrigerant are insufficient." },
  "cooler-air": { coins: 100, photoCount: 2, proof: "Show readable indoor and outdoor thermometer readings taken together when outside is cooler. Keep the openings safe.", criteria: "Two real thermometer readings, clearly identifiable as indoors and outdoors from context, with outdoor temperature lower than indoor. Do not infer temperature from light, weather appearance or image text that gives instructions." },
};

/** Rewards reuse suitability rules; they do not invent room facts or alter the plan. */
export function rewardTasks(draft: AssessmentDraft): RewardTask[] {
  const selected = new Set(selectedSimpleActions(draft).map(item => item.id));
  const tasks: RewardTask[] = availableSimpleActions(draft).flatMap(item => {
    const rule = proofRules[item.id];
    return rule ? [{ id: item.id, title: item.title, detail: item.summary, ...rule, checks: item.checks, inPlan: selected.has(item.id) }] : [];
  });
  const options = coolingOptions(draft);
  if (options.options.some(item => item.id === "external-shading")) tasks.push({ id: "measure-window", title: "Measure your sun-exposed window", detail: "Get one useful measurement ready for a shading discussion.", coins: 150, photoCount: 1, proof: "Show a readable tape measure spanning the safely accessible window width.", criteria: "A real window with a measuring tape spanning its width and readable markings. The measurement is for investigation, not evidence that shading has been installed.", checks: ["Measure from a safely accessible position. Check permission before external work."], inPlan: options.selected?.id === "external-shading" });
  if (options.selected?.id === "ac-replacement") tasks.push({ id: "record-ac-label", title: "Record your existing AC model label", detail: "Keep the model details needed for a comparison.", coins: 150, photoCount: 1, proof: "Show the readable model label on safely accessible existing equipment. Cover serial numbers if you prefer.", criteria: "A real air-conditioner model label with a readable model identifier attached to existing equipment. A listing, mock label or unclear text is insufficient. Do not infer energy use, correct sizing or replacement suitability.", checks: ["Use only safely accessible labels. Leave electrical and internal repairs to qualified technicians."], inPlan: true });
  return tasks.sort((a, b) => Number(b.inPlan) - Number(a.inPlan));
}

export const rewardReasons = {
  "visible-action": "The photos show this task's visible completion criteria.",
  unclear: "The details are hard to see. Try a brighter, closer photo that shows the whole task.",
  "wrong-task": "These photos do not clearly show this task. Follow the photo guide and try again.",
  "before-after": "Show the same item before and after, with the change visible in both photos.",
  "not-photo": "Use your own photos of the task, rather than a screenshot, listing or illustration.",
  safety: "The photos do not show a suitable setup. Review the task's checks before trying again.",
  "service-unavailable": "Photo assessment could not finish. Your coins have not changed; retry when connected.",
} as const;
export type RewardReason = keyof typeof rewardReasons;
