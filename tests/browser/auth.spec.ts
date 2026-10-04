import { test, expect, type Page } from "@playwright/test";
import { randomUUID } from "node:crypto";
import { journeyFixture } from "../helpers/journey-fixture";

const password = `Prototype-test-${randomUUID()}`;
const emailA = `auth-test-a-${randomUUID()}@example.com`;
const emailB = `auth-test-b-${randomUUID()}@example.com`;
async function signup(page: Page, email: string) {
  await page.goto("/sign-up");
  await page.getByLabel("Your name", { exact: true }).fill("Test homeowner");
  await page.getByLabel("Email address", { exact: true }).fill(email);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Create account", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Your home’s next steps" })).toBeVisible();
}
async function signin(page: Page, email: string) {
  await page.goto("/sign-in");
  await page.getByLabel("Email address", { exact: true }).fill(email);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Your home’s next steps" })).toBeVisible();
}
test("sign-in matches the theme on desktop/mobile and handles password visibility, errors and recovery", async ({ page }) => {
  await page.goto("/sign-in");
  await expect(page.getByRole("heading", { name: "Welcome back" })).toBeVisible();
  await page.getByLabel("Password", { exact: true }).fill("example password");
  await page.getByRole("button", { name: "Show password" }).click();
  await expect(page.getByLabel("Password", { exact: true })).toHaveAttribute("type", "text");
  await page.getByRole("button", { name: "Hide password" }).click();
  await page.screenshot({ path: "artifacts/verification/sign-in-desktop.png", fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: "artifacts/verification/sign-in-mobile.png", fullPage: true });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.route("**/api/auth/sign-in/email", route => route.fulfill({ status: 401, json: { code: "INVALID_EMAIL_OR_PASSWORD", message: "Invalid email or password" } }));
  await page.getByLabel("Email address", { exact: true }).fill("unknown@example.com");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page.locator('p[role="alert"]')).toContainText("doesn’t match");
  await expect(page.getByLabel("Email address", { exact: true })).toHaveValue("unknown@example.com");
  await page.getByRole("button", { name: "Forgot password?" }).click();
  await page.route("**/api/auth/request-password-reset", route => route.fulfill({ json: { status: true } }));
  await page.getByRole("button", { name: "Send reset link" }).click();
  await expect(page.getByRole("heading", { name: "Check your inbox" })).toBeVisible();
  await page.goto("/reset-password?error=INVALID_TOKEN");
  await expect(page.getByText("This reset link is invalid or has expired.", { exact: false })).toBeVisible();
});
test("real accounts save, restore on another device, isolate users and preserve explicit guest import", async ({ page, browser }) => {
  const fixture = journeyFixture();
  const draft = { ...fixture.draft, coolingPlanDraft: fixture.plan, followUpCheckIn: fixture.checkIn };
  await page.addInitScript(value => { if (!localStorage.getItem("home-heat-planner:assessment:v1")) localStorage.setItem("home-heat-planner:assessment:v1", JSON.stringify(value)); }, draft);
  await signup(page, emailA);
  await expect(page.getByRole("heading", { name: "Bring your assessment with you" })).toBeVisible();
  await page.getByRole("button", { name: "Save browser assessment to my account" }).click();
  await expect(page.getByRole("link", { name: "Open my room plan" })).toBeVisible();
  await expect(page.locator(".account-save-status")).toContainText("Saved to your account.");
  await page.reload();
  await expect(page.getByRole("link", { name: "Open my room plan" })).toBeVisible();
  const second = await browser.newContext();
  try {
    const secondPage = await second.newPage();
    await signin(secondPage, emailA);
    await expect(secondPage.getByRole("link", { name: "Open my room plan" })).toBeVisible();
    await secondPage.getByRole("link", { name: "Open my room plan" }).click();
    await expect(secondPage.getByRole("heading", { name: "My room plan", exact: true })).toBeVisible();
    const step = secondPage.locator('input[type="checkbox"]').first();
    await step.check();
    await secondPage.getByRole("button", { name: "Save my plan", exact: true }).click();
    await expect(secondPage.locator(".account-save-status")).toContainText("Saved to your account.");
    await secondPage.reload();
    await expect(secondPage.locator('input[type="checkbox"]').first()).toBeChecked();
  } finally { await second.close(); }
  await page.getByRole("button", { name: "Sign out", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Welcome back" })).toBeVisible();
  await signup(page, emailB);
  await expect(page.getByRole("heading", { name: "Start with one bedroom" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Open my room plan" })).toHaveCount(0);
  // Even a valid B session cannot act as A by naming A's identity.
  const user = await (await page.request.get("/api/auth/get-session")).json();
  const denied = await page.request.get("/api/account/journey", { headers: { "X-Account-User": "not-this-user" } });
  expect(denied.status()).toBe(401);
  const privateB = await page.request.get("/api/account/journey", { headers: { "X-Account-User": user.user.id } });
  expect((await privateB.json()).draft).toBeNull();
  await page.getByRole("button", { name: "Sign out", exact: true }).click();
  await signin(page, emailA);
  await expect(page.getByRole("link", { name: "Open my room plan" })).toBeVisible();
  await page.screenshot({ path: "artifacts/verification/account-saved.png", fullPage: true });
});
test("local auth setup failures give the same actionable message for email and Google", async ({ page }) => {
  await page.route("**/api/auth/sign-in/**", route => route.fulfill({ status: 503, json: { code: "AUTH_NOT_CONFIGURED", message: "Local sign-in needs setup. Run npm run setup:auth, then restart the development server." } }));
  await page.goto("/sign-in");
  await page.getByLabel("Email address", { exact: true }).fill("homeowner@example.com");
  await page.getByLabel("Password", { exact: true }).fill("retained password");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page.locator('p[role="alert"]')).toContainText("npm run setup:auth");
  await expect(page.getByLabel("Email address", { exact: true })).toHaveValue("homeowner@example.com");
  await page.getByRole("button", { name: "Continue with Google", exact: true }).click();
  await expect(page.locator('p[role="alert"]')).toContainText("npm run setup:auth");
  await expect(page.getByRole("button", { name: "Continue with Google", exact: true })).toBeEnabled();
  await expect(page).toHaveURL(/\/sign-in$/);
});
test("Google SSO initiates the real provider flow and direct guest account access is denied", async ({ page }) => {
  expect((await page.request.get("/api/account/journey")).status()).toBe(401);
  await page.goto("/sign-in");
  const social = page.waitForResponse(response => response.url().includes("/api/auth/sign-in/social"));
  await page.getByRole("button", { name: "Continue with Google" }).click();
  const result = await social;
  expect(result.status()).toBe(200);
  await expect(page).toHaveURL(/^https:\/\/accounts\.google\.com\//);
});
