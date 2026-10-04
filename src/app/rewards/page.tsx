import type { Metadata } from "next";
import { RewardsPage } from "@/features/rewards/rewards-page";
export const metadata: Metadata = { title: "Earn coins & approvals", description: "Complete suitable home tasks, submit photos for assessment and track your private coin rewards." };
export default function Page() { return <RewardsPage />; }
