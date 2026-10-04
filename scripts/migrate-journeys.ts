import { readFile } from "node:fs/promises";
import { neon } from "@neondatabase/serverless";

const connection = process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL;
if (!connection) throw new Error("Set the server-only DATABASE_URL_UNPOOLED before applying the journey migration.");
try {
  if (new URL(connection).hostname.includes("-pooler.")) throw new Error("Use a direct connection for migrations.");
  const sql = neon(connection, { fetchOptions: { signal: AbortSignal.timeout(15000) } });
  await sql.query(await readFile(new URL("../db/migrations/001_journeys.sql", import.meta.url), "utf8"));
  console.log("Journey migration applied.");
} catch {
  // Provider errors can contain connection details; never print them.
  console.error("Journey migration failed. Use a direct connection and check database access and migration permissions.");
  process.exitCode = 1;
}
