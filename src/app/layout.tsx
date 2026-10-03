import type { Metadata } from "next";
import type { ReactNode } from "react";
import { AppShell } from "@/components/layout/app-shell";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Home Heat Planner", template: "%s | Home Heat Planner" },
  description: "Understand bedroom overheating, reduce unnecessary cooling demand and prepare a practical room plan for hotter days in Greater Sydney.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return <html lang="en-AU"><body><AppShell>{children}</AppShell></body></html>;
}
