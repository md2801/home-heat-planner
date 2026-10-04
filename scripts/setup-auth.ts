import { randomBytes } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { parseEnv } from "node:util";
import { pathToFileURL } from "node:url";
import { authConfiguration } from "../src/lib/auth/config.ts";

/** Fill only missing local auth settings; preserve every other line and existing secret. */
export function prepareAuthEnvironment(existing: string | null, template: string, generateSecret = () => randomBytes(32).toString("base64")) {
  let content = existing ?? template;
  const values = parseEnv(content);
  const defaults = parseEnv(template);
  const added: string[] = [];
  for (const [key, value] of [
    ["NEON_AUTH_BASE_URL", defaults.NEON_AUTH_BASE_URL],
    ["NEON_AUTH_COOKIE_SECRET", values.NEON_AUTH_COOKIE_SECRET?.trim() ? values.NEON_AUTH_COOKIE_SECRET : generateSecret()],
  ] as const) {
    if (values[key]?.trim()) continue;
    if (!value?.trim()) throw new Error(`Set ${key} in .env.local before retrying.`);
    const line = `${key}=${JSON.stringify(value)}`;
    const pattern = new RegExp(`^[ \\t]*(?:export[ \\t]+)?${key}[ \\t]*=.*$`, "gm");
    if (pattern.test(content)) content = content.replace(pattern, line);
    else content += `${content && !content.endsWith("\n") ? "\n" : ""}${line}\n`;
    added.push(key);
  }
  authConfiguration(parseEnv(content));
  return { content, added };
}

export async function setupLocalAuth(directory = process.cwd()) {
  const target = resolve(directory, ".env.local");
  let existing: string | null = null;
  try { existing = await readFile(target, "utf8"); }
  catch (error) { if (!(error instanceof Error && "code" in error && error.code === "ENOENT")) throw error; }
  const template = await readFile(resolve(directory, ".env.example"), "utf8");
  const result = prepareAuthEnvironment(existing, template);
  if (existing !== result.content) await writeFile(target, result.content, { encoding: "utf8", mode: 0o600, flag: existing === null ? "wx" : "w" });
  return result.added;
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  try {
    const added = await setupLocalAuth();
    console.log(added.length ? `Local auth settings added: ${added.join(", ")}.` : "Local auth settings are already configured; existing values were preserved.");
    console.log("Restart npm run dev, then run npm run check:auth. .env.local stays ignored by Git.");
    console.log("For private account saving, also set DATABASE_URL from the same Neon branch through your team's secure configuration channel.");
  } catch (error) {
    console.error(error instanceof Error && error.name === "AuthConfigurationError" ? error.message : "Local auth setup failed. Check .env.example, .env.local and file permissions; existing settings were not replaced.");
    process.exitCode = 1;
  }
}
