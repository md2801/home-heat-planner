import type { Metadata } from "next";
import { ScreenPlaceholder } from "@/components/layout/screen-placeholder";

export const metadata: Metadata = { title: "Heat contributors" };

export default function Page() {
  return <ScreenPlaceholder path="/heat-contributors" />;
}
