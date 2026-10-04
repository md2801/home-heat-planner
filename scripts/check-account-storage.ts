import { neon } from "@neondatabase/serverless";
try {
  if (!process.env.DATABASE_URL) throw new Error("Database configuration missing");
  const sql = neon(process.env.DATABASE_URL, { fetchOptions: { signal: AbortSignal.timeout(10000) } });
  const rows = await sql.query("SELECT count(*)::int AS journeys FROM heat_planner_account_journeys");
  console.log(`Account journey table is available; ${Number(rows[0]?.journeys)} saved journeys.`);
} catch { console.error("Account storage check failed. Check the migration and database connection."); process.exitCode = 1; }
