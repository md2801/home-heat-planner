import type { Metadata } from "next";
import Link from "next/link";
import { JourneyHeader } from "@/components/layout/journey-header";
import { EnergyChat } from "@/features/energy-assistant/energy-chat";
import styles from "@/features/energy-assistant/energy-assistant.module.css";
export const metadata: Metadata = { title: "Energy Assistant", description: "Understand household electricity use and investigate practical ways to reduce demand." };
export default function EnergyAssistantPage() {
  return <div className={styles.page}><JourneyHeader /><section className={styles.hero} aria-labelledby="energy-title"><span className={styles.eyebrow}>HOME HEAT PLANNER · USE ENERGY THOUGHTFULLY</span><h1 id="energy-title">Energy Assistant</h1><p>Understand your electricity use. Find practical places to start, with clear facts and room for what we don’t yet know.</p><Link href="/assessment">← Return to your room assessment</Link></section><EnergyChat /></div>;
}
