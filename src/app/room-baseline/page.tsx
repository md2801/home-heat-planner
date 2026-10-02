import type { Metadata } from "next";
import { RoomBaselinePage } from "@/features/room-baseline/room-baseline-page";

export const metadata: Metadata = { title: "Your room and cooling baseline" };

export default function Page() {
  return <RoomBaselinePage />;
}
