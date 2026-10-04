import { readFile } from "node:fs/promises";
import { neon } from "@neondatabase/serverless";
// HTTP uses one prepared statement per query. Keep function bodies together.
function statements(sql: string) {
  const result: string[] = [];
  let start = 0, quoted = false, body = false, comment = false;
  for (let index = 0; index < sql.length; index++) {
    const char = sql[index], pair = sql.slice(index, index + 2);
    if (comment) { if (char === "\n") comment = false; continue; }
    if (body) { if (pair === "$$") { body = false; index++; } continue; }
    if (quoted) { if (pair === "''") index++; else if (char === "'") quoted = false; continue; }
    if (pair === "--") { comment = true; index++; }
    else if (pair === "$$") { body = true; index++; }
    else if (char === "'") quoted = true;
    else if (char === ";") { result.push(sql.slice(start, index + 1)); start = index + 1; }
  }
  if (sql.slice(start).trim()) result.push(sql.slice(start));
  return result;
}
try {
  const url = process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL;
  if (!url || new URL(url).hostname.includes("-pooler.")) throw new Error();
  const sql = neon(url, { fetchOptions: { signal: AbortSignal.timeout(20000) } });
  const migration = await readFile(new URL("../db/migrations/003_home_rewards.sql", import.meta.url), "utf8");
  await sql.transaction(statements(migration).map(statement => sql.query(statement)));
  console.log("Home Rewards migration applied.");
} catch (error) {
  const code = error && typeof error === "object" && "code" in error && typeof error.code === "string" && /^[A-Z0-9_]{1,40}$/.test(error.code) ? error.code : "unavailable";
  console.error(`Rewards migration failed (${code}). Check the direct database connection and permissions.`);
  process.exitCode = 1;
}
