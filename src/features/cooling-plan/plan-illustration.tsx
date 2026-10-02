import { BedroomCrossSection, type IllustrationCallout } from "@/components/illustrations/bedroom-cross-section";
import type { CoolingOption } from "@/features/cooling-options/model";
import type { RoomProfile } from "@/domain/models";
import styles from "./cooling-plan.module.css";

/** Reuses the complete architectural drawing; concept annotations are not new room facts. */
export function PlanIllustration({ option, profile }: { option: CoolingOption; profile: RoomProfile }) {
  const shading = option.id === "external-shading";
  const insulation = option.id === "ceiling-insulation";
  const shade = profile.windowSummary?.externalShading;
  const callouts: IllustrationCallout[] = [{ text: shading ? "Shading idea" : insulation ? "Ceiling / roof review" : "Opening review", detail: "Selected investigation", x: shading ? 692 : insulation ? 520 : 678, y: shading ? 290 : insulation ? 95 : 310, width: 238, accent: "cooling", target: insulation ? [524, 150] : [714, 346] }];
  if (insulation && profile.insulation.status === "unknown") callouts.push({ text: "Insulation · Not sure", detail: "Confirm before choosing work", x: 175, y: 175, width: 250, accent: "heat" });
  return <figure className={styles.illustration}><div className={styles.scene}><svg viewBox="160 65 780 490" fill="none" xmlns="http://www.w3.org/2000/svg" role="img" aria-label={`Illustrative bedroom cross-section for ${option.title}. Highlighting is an investigation concept, not measured or predicted cooling performance.`}><svg width="940" height="580" aria-hidden="true"><BedroomCrossSection callouts={callouts} contributors={{ roof: false, sun: shading, externalShade: shading || (shade?.status === "known" && shade.value !== "none"), coolingEquipment: profile.cooling.status === "known" && profile.cooling.value.equipment.includes("air-conditioner") }} /></svg>
    {!shading && <g aria-hidden="true"><path d={insulation ? "M333 236H717" : "M707 314H723V432H707Z"} stroke="var(--color-forest)" strokeWidth="3" strokeDasharray="6 5" opacity=".7" /></g>}
    </svg>
    </div><figcaption>{shading ? "Illustrative shading concept · not installed or confirmed suitable" : "Illustrative room · highlight shows the area to investigate"}<br />Not a thermal simulation or a prediction of cooling performance.</figcaption></figure>;
}
