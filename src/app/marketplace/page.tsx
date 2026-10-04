import type { Metadata } from "next";
import { MarketplacePage } from "@/features/marketplace/marketplace-page";

export const metadata: Metadata = {
  title: "Rewards Marketplace",
  description: "Explore prototype household rewards for following through on home heat-resilience and energy actions.",
};
export default function Page() { return <MarketplacePage />; }
