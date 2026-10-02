import type { Metadata } from "next";
import { ScreenPlaceholder } from "@/components/layout/screen-placeholder";

export const metadata: Metadata = { title: "Your room assessment" };

export default function Page() {
  return <ScreenPlaceholder path="/assessment" />;
}
