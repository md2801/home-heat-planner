import type { Metadata } from "next";
import Link from "next/link";
import { DocumentImport } from "@/features/document-import/document-import";
import styles from "@/features/document-import/document-import.module.css";
export const metadata: Metadata = { title: "Document review", description: "Review electricity bills, AC energy labels and installation quotes before using their values." };
export default function DocumentImportPage() {
  return <div className={styles.page}><header className={styles.hero}><Link href="/">Home Heat Planner</Link><h1>Read a document.<br />Keep the details you trust.</h1><p>Bring an electricity bill, an AC energy label or an installation quote. Check every value against its source, with the units and unknowns kept clear.</p><p className={styles.small}>This is a separate document review. Nothing is added to your room assessment.</p></header><DocumentImport /></div>;
}
