import type { Metadata } from "next";
import { ScreenPlaceholder } from "@/components/layout/screen-placeholder";

export const metadata: Metadata = { title: "My cooling plan" };

export default function Page() {
  return <ScreenPlaceholder path="/cooling-plan" />;
}
