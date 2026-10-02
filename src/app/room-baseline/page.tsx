import type { Metadata } from "next";
import { ScreenPlaceholder } from "@/components/layout/screen-placeholder";

export const metadata: Metadata = { title: "Your room and cooling baseline" };

export default function Page() {
  return <ScreenPlaceholder path="/room-baseline" />;
}
