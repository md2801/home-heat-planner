import type { OptionId } from "../cooling-options/model.ts";
import type { CoolingResearchContext } from "../cooling-options/research-context.ts";
import { reviewedOn, sources, techniques } from "./catalogue.ts";

export const optionTechniqueIds: Record<OptionId, readonly string[]> = {
  "external-shading": ["close-curtains", "external-shade", "shade-plants"],
  "ceiling-insulation": ["check-insulation"],
  "opening-review": ["cooler-air"],
  "ac-replacement": ["comfortable-setting", "clean-filters", "cool-used-rooms", "fans", "reduce-indoor-heat"],
};
export type ResourceIds = Partial<Record<OptionId, readonly string[]>>;

/** Select locally from typed room reports; no extra user data crosses the provider boundary. */
export function recommendationResources(input: CoolingResearchContext) {
  const byOption: ResourceIds = {};
  const included = new Set<string>();
  for (const option of input.options) {
    const ids = optionTechniqueIds[option.id].filter(id => {
      if (id === "fans" && !input.room.coolingEquipment?.includes("fan")) return false;
      if (id === "cooler-air" && input.room.windowsOpen === "none") return false;
      if (["external-shade", "shade-plants"].includes(id) && input.room.externalChangesPermitted === false) return false;
      return true;
    });
    byOption[option.id] = ids;
    ids.forEach(id => included.add(id));
  }
  return {
    reviewedOn,
    byOption,
    entries: techniques.filter(item => included.has(item.id)).map(item => ({
      id: item.id, title: item.title, summary: item.summary, benefit: item.benefit,
      steps: item.steps, checks: item.checks,
      sources: item.sourceIds.map(id => sources[id]),
    })),
  };
}
