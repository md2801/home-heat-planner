import { BedroomCrossSection, type IllustrationCallout } from "@/components/illustrations/bedroom-cross-section";
import type { CoolingOption } from "@/features/cooling-options/model";
import type { RoomProfile } from "@/domain/models";
import styles from "./cooling-plan.module.css";

/** Reuses the complete architectural drawing; concept annotations are not new room facts. */
export function PlanIllustration({ option, profile }: { option: CoolingOption; profile: RoomProfile }) {
  const shading = option.id === "external-shading";
  const insulation = option.id === "ceiling-insulation";
  const shade = profile.windowSummary?.externalShading;
  const callouts: IllustrationCallout[] = [{ text: shading ? "Shading idea" : insulation ? "Ceiling / roof review" : option.id === "ac-replacement" ? "AC replacement review" : "Opening review", detail: "Selected investigation", x: insulation ? 540 : 695, y: insulation ? 150 : 320, width: 238, accent: "cooling", target: insulation ? [500, 281] : [727, 449] }];
  if (insulation && profile.insulation.status === "unknown") callouts.push({ text: "Insulation · Not sure", detail: "Confirm before choosing work", x: 175, y: 175, width: 250, accent: "heat" });
  return <figure className={styles.illustration}><div className={styles.scene}><BedroomCrossSection fullRoom callouts={callouts} contributors={{ roof: false, sun: shading, externalShade: shading || (shade?.status === "known" && shade.value !== "none"), coolingEquipment: profile.cooling.status === "known" && profile.cooling.value.equipment.includes("air-conditioner") }}>
    {!shading && option.id !== "ac-replacement" && <g aria-hidden="true"><path d={insulation ? "M231 281H729" : "M713 379H729V519H713Z"} stroke="var(--color-forest)" strokeWidth="3" strokeDasharray="6 5" opacity=".7" /></g>}
    </BedroomCrossSection>
    </div><figcaption>{shading ? "Illustrative shading concept · not installed or confirmed suitable" : "Illustrative room · highlight shows the area to investigate"}<br />Not a thermal simulation or a prediction of cooling performance.</figcaption></figure>;
}
