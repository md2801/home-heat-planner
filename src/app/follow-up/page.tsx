import type { Metadata } from "next";
import { ScreenPlaceholder } from "@/components/layout/screen-placeholder";

export const metadata: Metadata = { title: "Your cooling plan follow-up" };

export default function Page() {
  return <ScreenPlaceholder path="/follow-up" />;
}
