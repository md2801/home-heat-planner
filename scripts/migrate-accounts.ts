import { readFile } from "node:fs/promises";
import { neon } from "@neondatabase/serverless";
const url = process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL;
if (!url) throw new Error("Configure a direct DATABASE_URL_UNPOOLED for account migration.");
try {
  if (new URL(url).hostname.includes("-pooler.")) throw new Error("Direct connection required");
  const sql = neon(url, { fetchOptions: { signal: AbortSignal.timeout(15000) } });
  await sql.query(await readFile(new URL("../db/migrations/002_account_journeys.sql", import.meta.url), "utf8"));
  console.log("Account journey migration applied.");
} catch { console.error("Account migration failed. Check the direct connection and database permissions."); process.exitCode = 1; }
