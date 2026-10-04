import { readFile } from "node:fs/promises";
import { parseEnv } from "node:util";
import { authConfiguration, AuthConfigurationError } from "../src/lib/auth/config.ts";

try {
  let local: Record<string, string | undefined> = {};
  try { local = parseEnv(await readFile(".env.local", "utf8")); }
  catch (error) { if (!(error instanceof Error && "code" in error && error.code === "ENOENT")) throw error; }
  const environment = { ...local, ...process.env };
  const configuration = authConfiguration(environment);
  console.log("Auth URL and cookie secret pass configuration checks.");
  if (!environment.DATABASE_URL?.trim()) console.log("Private account saving still needs DATABASE_URL from the same Neon branch. Sign-in itself does not require it.");
  const response = await fetch(`${configuration.baseUrl.replace(/\/$/, "")}/get-session`, { signal: AbortSignal.timeout(10000), redirect: "error" });
  await response.body?.cancel();
  if (!response.ok) { console.error(`Auth provider returned HTTP ${response.status}. Check the Auth URL, branch availability and Neon settings.`); process.exitCode = 1; }
  else console.log("Auth provider is reachable. Restart your development server after changing environment settings.");
} catch (error) {
  console.error(error instanceof AuthConfigurationError ? error.message : "Auth check failed. Check your internet connection, Auth URL and local file permissions; no credentials were printed.");
  process.exitCode = 1;
}
