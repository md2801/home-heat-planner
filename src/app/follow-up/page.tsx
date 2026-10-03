import type { Metadata } from "next";
import { FollowUpPage } from "@/features/follow-up/follow-up-page";

export const metadata: Metadata = { title: "Your room plan follow-up" };

export default function Page() {
  return <FollowUpPage />;
}
