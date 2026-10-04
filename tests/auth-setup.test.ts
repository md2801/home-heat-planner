import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { parseEnv } from "node:util";
import { spawnSync } from "node:child_process";
import { authConfiguration, AuthConfigurationError } from "../src/lib/auth/config.ts";
import { prepareAuthEnvironment, setupLocalAuth } from "../scripts/setup-auth.ts";
import { createAuthProxy } from "../src/server/auth/proxy.ts";

const baseUrl = "https://example.neonauth.aws.neon.tech/planner/auth";
const secret = "test-private-cookie-secret-with-32-characters";
const template = `DATABASE_URL=\nNEON_AUTH_BASE_URL=${baseUrl}\nNEON_AUTH_COOKIE_SECRET=\n`;

test("auth configuration detects missing/invalid settings without disclosing their values", () => {
  assert.throws(() => authConfiguration({}), error => error instanceof AuthConfigurationError && error.issues.length === 2);
  for (const url of ["not-a-url", "http://auth.example/auth", "https://user:private@auth.example/auth", `${baseUrl}?secret=private`]) {
    assert.throws(() => authConfiguration({ NEON_AUTH_BASE_URL: url, NEON_AUTH_COOKIE_SECRET: secret }), error => error instanceof AuthConfigurationError && !error.message.includes("private") && !error.message.includes(url));
  }
  assert.throws(() => authConfiguration({ NEON_AUTH_BASE_URL: baseUrl, NEON_AUTH_COOKIE_SECRET: " ".repeat(32) }), AuthConfigurationError);
  assert.throws(() => authConfiguration({ NEON_AUTH_BASE_URL: baseUrl, NEON_AUTH_COOKIE_SECRET: "short" }), AuthConfigurationError);
  assert.deepEqual(authConfiguration({ NEON_AUTH_BASE_URL: ` ${baseUrl} `, NEON_AUTH_COOKIE_SECRET: secret }), { baseUrl, cookies: { secret } });
});

test("fresh local setup creates a random private secret and preserves custom configurations on repeat", () => {
  const fresh = prepareAuthEnvironment(null, template);
  const values = parseEnv(fresh.content);
  assert.equal(values.NEON_AUTH_BASE_URL, baseUrl);
  assert.equal(Buffer.from(values.NEON_AUTH_COOKIE_SECRET!, "base64").length, 32);
  assert.notEqual(prepareAuthEnvironment(null, template).content, fresh.content);
  assert.deepEqual(prepareAuthEnvironment(fresh.content, template), { content: fresh.content, added: [] });
  const existing = `# Keep this comment\r\nDATABASE_URL="postgres://private@example/db"\r\nOPEN_AI_KEY=private-provider\r\nNEON_AUTH_BASE_URL=https://other.example/auth\r\nNEON_AUTH_COOKIE_SECRET="${secret}"\r\n`;
  assert.deepEqual(prepareAuthEnvironment(existing, template), { content: existing, added: [] });
  const partial = prepareAuthEnvironment("DATABASE_URL=private-database\nNEON_AUTH_COOKIE_SECRET=\n", template, () => secret);
  assert.equal(parseEnv(partial.content).DATABASE_URL, "private-database");
  assert.equal(parseEnv(partial.content).NEON_AUTH_COOKIE_SECRET, secret);
  assert.equal(parseEnv(partial.content).NEON_AUTH_BASE_URL, baseUrl);
});

test("setup command works from a fresh directory, remains idempotent and never prints credentials", async () => {
  const directory = await mkdtemp(join(tmpdir(), "heat-planner-auth-"));
  try {
    await writeFile(join(directory, ".env.example"), template);
    const script = fileURLToPath(new URL("../scripts/setup-auth.ts", import.meta.url));
    const run = () => spawnSync(process.execPath, ["--experimental-strip-types", script], { cwd: directory, encoding: "utf8" });
    const first = run();
    assert.equal(first.status, 0, first.stderr);
    const content = await readFile(join(directory, ".env.local"), "utf8");
    const localSecret = parseEnv(content).NEON_AUTH_COOKIE_SECRET!;
    assert.ok(!first.stdout.includes(localSecret));
    assert.equal(run().status, 0);
    assert.equal(await readFile(join(directory, ".env.local"), "utf8"), content);
    const invalid = `DATABASE_URL=private-database\nNEON_AUTH_BASE_URL=${baseUrl}\nNEON_AUTH_COOKIE_SECRET=short\n`;
    await writeFile(join(directory, ".env.local"), invalid);
    await assert.rejects(() => setupLocalAuth(directory), AuthConfigurationError);
    assert.equal(await readFile(join(directory, ".env.local"), "utf8"), invalid);
  } finally {
    // directory is the exact task-owned path created by mkdtemp above.
    assert.ok(directory.startsWith(join(tmpdir(), "heat-planner-auth-")));
    await rm(directory, { recursive: true, force: true });
  }
});

test("email and Google routes report setup failures and preserve configured provider responses", async () => {
  const events: unknown[] = [];
  const proxy = createAuthProxy(() => { authConfiguration({}); return {}; }, true, event => events.push(event));
  for (const path of ["sign-in/email", "sign-in/social"]) {
    const response = await proxy(new Request(`http://localhost:3000/api/auth/${path}`, { method: "POST" }), { params: Promise.resolve({ path: path.split("/") }) });
    assert.equal(response.status, 503);
    assert.equal((await response.json()).code, "AUTH_NOT_CONFIGURED");
    assert.equal(response.headers.get("cache-control"), "private, no-store");
  }
  assert.deepEqual(events[0], { boundary: "configuration", issues: ["NEON_AUTH_BASE_URL is missing", "NEON_AUTH_COOKIE_SECRET is missing"] });
  const successful = createAuthProxy(() => ({ POST: async () => Response.json({ url: "https://accounts.google.com/" }, { headers: { "Set-Cookie": "test=value; HttpOnly" } }) }), false, event => events.push(event));
  const response = await successful(new Request("https://planner.example/api/auth/sign-in/social", { method: "POST" }), { params: Promise.resolve({ path: ["sign-in", "social"] }) });
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("set-cookie"), "test=value; HttpOnly");
  assert.deepEqual(await response.json(), { url: "https://accounts.google.com/" });
  const unavailable = createAuthProxy(() => { throw new Error("private cookie/provider diagnostics"); }, false, event => events.push(event));
  const failed = await unavailable(new Request("https://planner.example/api/auth/get-session"), { params: Promise.resolve({ path: ["get-session"] }) });
  const body = await failed.text();
  assert.equal(failed.status, 503);
  assert.ok(body.includes("AUTH_UNAVAILABLE"));
  assert.ok(!body.includes("private"));
  assert.deepEqual(events.at(-1), { boundary: "request" });
});
