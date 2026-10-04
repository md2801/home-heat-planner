import type { Metadata } from "next";
import { LandingPage } from "@/features/landing/landing-page";

export const metadata: Metadata = {
  title: { absolute: "Home Heat Planner" },
  description: "Understand your room, make sense of your electricity use, and explore practical steps for a more comfortable, resilient home.",
};

export default function Page() {
  return <LandingPage />;
}
