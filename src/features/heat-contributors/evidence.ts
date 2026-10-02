import type { EvidenceSource } from "../../domain/models.ts";

/** Retrieved guidance supports mechanisms, never a measured result for this bedroom. */
export const contributorEvidence: readonly EvidenceSource[] = [
  { id: "yourhome-shading", title: "YourHome · Shading", url: "https://www.yourhome.gov.au/passive-design/shading", excerpt: "Shading simply means blocking the direct rays of the sun.", reviewedAt: "2026-10-02", contentVersion: "qualitative-review-1" },
  { id: "yourhome-insulation", title: "YourHome · Insulation", url: "https://www.yourhome.gov.au/passive-design/insulation", excerpt: "Insulation reduces heat flow and is essential for keeping your home warm in winter and cool in summer.", reviewedAt: "2026-10-02", contentVersion: "qualitative-review-1" },
  { id: "yourhome-passive-cooling", title: "YourHome · Passive cooling", url: "https://www.yourhome.gov.au/passive-design/passive-cooling", excerpt: "Air movement cools buildings by carrying heat out of the building and replacing it with cooler external air.", reviewedAt: "2026-10-02", contentVersion: "qualitative-review-1" },
];
