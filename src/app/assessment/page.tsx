import type { Metadata } from "next";
import { AssessmentPage } from "@/features/assessment/assessment-page";

export const metadata: Metadata = { title: "Your room assessment" };

export default function Page() {
  return <AssessmentPage />;
}
