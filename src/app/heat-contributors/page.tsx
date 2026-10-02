import type { Metadata } from "next";
import { HeatContributorsPage } from "@/features/heat-contributors/heat-contributors-page";

export const metadata: Metadata = { title: "Heat contributors" };

export default function Page() {
  return <HeatContributorsPage />;
}
