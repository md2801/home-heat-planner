import type { Metadata } from "next";
import { CoolingOptionsPage } from "@/features/cooling-options/cooling-options-page";

export const metadata: Metadata = { title: "Your room improvements" };

export default function Page() {
  return <CoolingOptionsPage />;
}
