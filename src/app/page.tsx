import type { Metadata } from "next";
import { LandingPage } from "@/features/landing/landing-page";

export const metadata: Metadata = { title: { absolute: "Home Heat Planner" } };

export default function Page() {
  return <LandingPage />;
}
