import { neon } from "@neondatabase/serverless";
import { serverAuth } from "@/lib/auth/server";
import { createAccountHandler } from "@/server/account/http";
import { createAccountStore } from "@/server/account/store";
export const runtime = "nodejs";
const handle = createAccountHandler(async () => {
  const { data, error } = await serverAuth().getSession();
  if (error) throw new Error("Session validation unavailable");
  return data?.user.id ?? null;
}, () => {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("Database unavailable");
  const sql = neon(url, { fetchOptions: { signal: AbortSignal.timeout(10000) } });
  return createAccountStore((query, parameters) => sql.query(query, parameters));
});
export { handle as GET, handle as PUT };
