import { defineConfig } from "@playwright/test";
import { readFileSync } from "node:fs";
import { parseEnv } from "node:util";
// Load the isolated credentials before spawning Next; --env-file in execArgv is forwarded into NODE_OPTIONS by Next dev.
Object.assign(process.env, parseEnv(readFileSync(".env.auth-test.local", "utf8")));
export default defineConfig({
  testDir: "./tests/browser", testMatch: "auth.spec.ts", fullyParallel: false, workers: 1, timeout: 60000,
  use: { baseURL: "http://localhost:3101", browserName: "chromium", channel: process.env.PLAYWRIGHT_CHANNEL ?? "chrome", headless: true, viewport: { width: 1440, height: 1000 }, screenshot: "only-on-failure" },
  webServer: { command: "npm run dev -- --port 3101", url: "http://localhost:3101/sign-in", reuseExistingServer: false, timeout: 120000 },
});
