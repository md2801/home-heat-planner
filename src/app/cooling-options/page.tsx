import type { Metadata } from "next";
import { CoolingOptionsPage } from "@/features/cooling-options/cooling-options-page";

export const metadata: Metadata = { title: "Your cooling options" };

export default function Page() {
  return <CoolingOptionsPage />;
}
