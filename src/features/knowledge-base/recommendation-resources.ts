import type { OptionId } from "../cooling-options/model.ts";
import type { CoolingResearchContext } from "../cooling-options/research-context.ts";
import { reviewedOn, sources, techniques } from "./catalogue.ts";
import { hasReportedAC } from "../cooling-options/recommendation-policy.ts";

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
  // A bounded catalogue is the vocabulary, not a fixed recommendation list.
  // The model chooses relevant actions and generates their room-specific wording.
  const hasContext = input.room.coolingEquipment !== null || input.room.heatTiming !== null || input.room.position !== null || input.room.aboveRoom !== null || input.room.windowCount !== null;
  const techniqueIds = hasContext ? techniques.filter(item => {
    switch (item.id) {
      case "close-curtains": return input.room.windowCount !== 0 && input.room.internalCoverings?.some(value => ["curtains", "blinds", "shutters"].includes(value)) === true;
      case "external-shade": case "shade-plants": return input.options.some(option => option.id === "external-shading");
      case "cooler-air": return input.room.windowCount !== 0 && ["all", "some"].includes(input.room.windowsOpen ?? "");
      case "fans": return input.room.coolingEquipment?.includes("fan") === true;
      case "comfortable-setting": case "clean-filters": case "cool-used-rooms": return hasReportedAC(input.room.coolingEquipment);
      case "check-insulation": return input.options.some(option => option.id === "ceiling-insulation");
      case "reduce-indoor-heat": return true;
      default: return false; // Other household topics stay in the general library.
    }
  }).map(item => item.id) : [];
  techniqueIds.forEach(id => included.add(id));
  return {
    reviewedOn,
    byOption,
    techniqueIds,
    entries: techniques.filter(item => included.has(item.id)).map(item => ({
      id: item.id, title: item.title, summary: item.summary, benefit: item.benefit,
      steps: item.steps, checks: item.checks,
      sources: item.sourceIds.map(id => sources[id]),
    })),
  };
}
