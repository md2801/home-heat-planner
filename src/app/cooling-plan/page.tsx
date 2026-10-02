import type { Metadata } from "next";
import { CoolingPlanPage } from "@/features/cooling-plan/cooling-plan-page";

export const metadata: Metadata = { title: "My cooling plan" };

export default function Page() {
  return <CoolingPlanPage />;
}
