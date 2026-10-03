import type { Fact } from "../../domain/models.ts";
import type { AssessmentDraft } from "../assessment/state.ts";
import { coolingOptions } from "./model.ts";

const known = <T,>(fact: Fact<T> | undefined): T | null => fact?.status === "known" ? fact.value : null;
/** Only typed room categories cross the provider boundary; no free text or financial inputs. */
export function coolingResearchContext(draft: AssessmentDraft) {
  const view = coolingOptions(draft), profile = view.baseline.profile;
  return {
    region: "Greater Sydney, Australia",
    room: {
      heatTiming: known(profile.heatTiming), position: known(profile.position), aboveRoom: known(profile.aboveRoom), insulation: known(profile.insulation),
      windowDirections: known(profile.windowSummary?.orientations), externalShade: known(profile.windowSummary?.externalShading), windowsOpen: known(profile.windowSummary?.opens),
      coolingEquipment: profile.cooling.status === "known" ? profile.cooling.value.equipment : null,
      openingConstraintsReported: profile.ventilationConstraints.status === "known", externalChangesPermitted: known(profile.externalChangesPermitted),
    },
    options: view.options.map(({ id, title }) => ({ id, title })),
  };
}
export type CoolingResearchContext = ReturnType<typeof coolingResearchContext>;
