import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "./tests/browser",
  testMatch: "document-import.spec.ts",
  fullyParallel: false,
  workers: 1,
  timeout: 30000,
  use: { baseURL: "http://localhost:3100", browserName: "chromium", ...(process.env.PLAYWRIGHT_CHANNEL ? { channel: process.env.PLAYWRIGHT_CHANNEL } : {}), headless: true, viewport: { width: 1440, height: 1100 }, screenshot: "only-on-failure" },
  webServer: { command: "npm run dev -- --port 3100", url: "http://localhost:3100/document-import", reuseExistingServer: false, timeout: 120000 },
});
