import type { Metadata } from "next";
import type { ReactNode } from "react";
import { AppShell } from "@/components/layout/app-shell";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Home Heat Planner", template: "%s | Home Heat Planner" },
  description: "A bedroom cooling planner for Greater Sydney homeowners.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return <html lang="en-AU"><body><AppShell>{children}</AppShell></body></html>;
}
