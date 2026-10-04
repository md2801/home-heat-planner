import { defineConfig } from "@playwright/test";
import { readFileSync } from "node:fs";
import { parseEnv } from "node:util";
import { pathToFileURL } from "node:url";
import { resolve } from "node:path";
Object.assign(process.env, parseEnv(readFileSync(".env.auth-test.local", "utf8")));
// Isolated DB/auth and an exact fetch interception; no paid assessment in this test.
process.env.OPEN_AI_KEY = "browser-test-only-not-a-provider-key";
process.env.NODE_OPTIONS = `${process.env.NODE_OPTIONS ?? ""} --import=${pathToFileURL(resolve("tests/helpers/mock-reward-provider.mjs")).href}`.trim();
export default defineConfig({
  testDir: "./tests/browser", testMatch: "rewards.spec.ts", fullyParallel: false, workers: 1, timeout: 120000,
  expect: { timeout: 15000 },
  use: { baseURL: "http://localhost:3102", browserName: "chromium", channel: process.env.PLAYWRIGHT_CHANNEL ?? "chrome", headless: true, viewport: { width: 1440, height: 1000 }, screenshot: "only-on-failure" },
  webServer: { command: "npm run build && npm run start -- --port 3102", url: "http://localhost:3102/sign-in", reuseExistingServer: false, timeout: 180000 },
});
