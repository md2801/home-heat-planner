import { expect, test } from "@playwright/test";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import type { AcRole, DocumentKind } from "../../src/contracts/document-import.ts";
import { validateDocumentExtraction } from "../../src/server/document-import/validation.ts";
import type { DocumentMime } from "../../src/server/document-import/upload.ts";
const folder = new URL("../fixtures/document-import/", import.meta.url);
interface Fixture { file: string; mime: DocumentMime; kind: DocumentKind; acRole: AcRole; lines: string[]; raw: unknown }
const fixtures: Fixture[] = JSON.parse(await readFile(new URL("examples.json", folder), "utf8"));
function fixtureResponse(file: string) {
  const fixture = fixtures.find(f => f.file === file)!;
  return { ok: true, result: validateDocumentExtraction(fixture.raw, { bytes: new Uint8Array(), mime: fixture.mime, pageCount: 1, pageTexts: fixture.mime === "application/pdf" ? [fixture.lines.join("\n")] : [null] }, fixture.kind, "existing") };
}
test.beforeEach(async ({ page }) => {
  page.on("pageerror", error => { throw error; });
  await page.addInitScript(() => {
    if (window === window.top && window.location.protocol === "http:") localStorage.setItem("home-heat-planner:assessment:v1", "existing-assessment-marker");
  });
  await page.goto("/document-import");
});
test("correct, confirm and export reviewed values without writing assessment state", async ({ page }, info) => {
  await page.route("**/api/document-import?**", route => route.fulfill({ json: fixtureResponse("ac-label.png") }));
  await page.getByLabel("What are you uploading?").selectOption("ac-label");
  await page.getByLabel("Choose a file").setInputFiles(fileURLToPath(new URL("ac-label.png", folder)));
  await page.getByRole("button", { name: "Read document", exact: true }).click();
  await expect(page.getByText("0 of 2 fields reviewed")).toBeVisible();
  await expect(page.getByRole("button", { name: "Finish review", exact: true })).toBeDisabled();
  await page.locator('[data-field="existingModel"]').getByRole("button", { name: "Confirm value" }).click();
  const energy = page.locator('[data-field="existingKwh"]');
  await energy.getByRole("button", { name: "Correct value" }).click();
  await energy.getByLabel("Correct labelled cooling energy").fill("-10");
  await energy.getByRole("button", { name: "Save correction" }).click();
  await expect(energy.getByRole("alert")).toBeVisible();
  await energy.getByLabel("Correct labelled cooling energy").fill("650");
  await energy.getByRole("button", { name: "Save correction" }).click();
  await expect(energy.getByText("Corrected by you")).toBeVisible();
  await energy.getByText("Original source excerpt").click();
  await expect(energy.locator("blockquote")).toContainText("600 kWh/year");
  await page.screenshot({ path: info.outputPath("document-import-desktop.png"), fullPage: true });
  await page.getByRole("button", { name: "Finish review", exact: true }).click();
  await expect(page.getByText("Review complete", { exact: true })).toBeVisible();
  const downloading = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download reviewed values" }).click();
  const downloaded = await downloading;
  const snapshot = JSON.parse(await readFile((await downloaded.path())!, "utf8"));
  expect(snapshot.fields[1].value).toBe(650); expect(snapshot.fields[1].unit).toBe("kWh/year");
  expect(snapshot.fields[1].origin).toBe("user-corrected");
  expect(await page.evaluate(() => localStorage.getItem("home-heat-planner:assessment:v1"))).toBe("existing-assessment-marker");
});
test("unknown fields can be rejected, reviewed state can be edited, and mobile layout stays within the viewport", async ({ page }, info) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.route("**/api/document-import?**", route => route.fulfill({ json: fixtureResponse("incomplete-quote.pdf") }));
  await page.getByLabel("What are you uploading?").selectOption("installation-quote");
  await page.getByLabel("Choose a file").setInputFiles(fileURLToPath(new URL("incomplete-quote.pdf", folder)));
  await page.getByRole("button", { name: "Read document", exact: true }).click();
  await expect(page.getByText("0 of 5 fields reviewed")).toBeVisible();
  await page.locator('[data-field="quoteScope"]').getByRole("button", { name: "Reject value" }).click();
  for (const field of ["installedCost", "currency", "quoteDate", "proposedRecurring"]) await page.locator(`[data-field="${field}"]`).getByRole("button", { name: "Keep unknown" }).click();
  await page.getByRole("button", { name: "Finish review", exact: true }).click();
  await expect(page.getByText("Review complete", { exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.screenshot({ path: info.outputPath("document-import-mobile.png"), fullPage: true });
  await page.getByRole("button", { name: "Edit reviewed values" }).click();
  await page.locator('[data-field="installedCost"]').getByRole("button", { name: "Enter a value" }).click();
  await expect(page.getByRole("button", { name: "Finish review", exact: true })).toBeDisabled();
});
test("processing and provider failure allow a retry with the selected file intact", async ({ page }) => {
  let calls = 0;
  await page.route("**/api/document-import?**", async route => {
    calls++;
    if (calls === 1) { await new Promise(resolve => setTimeout(resolve, 500)); await route.fulfill({ status: 503, json: { ok: false, message: "Reading unavailable" } }); }
    else await route.fulfill({ json: fixtureResponse("electricity-bill.pdf") });
  });
  await page.getByLabel("Choose a file").setInputFiles(fileURLToPath(new URL("electricity-bill.pdf", folder)));
  await page.getByRole("button", { name: "Read document", exact: true }).click();
  await expect(page.getByText("Reading your document…", { exact: true })).toBeVisible();
  await expect(page.getByRole("alert").filter({ hasText: "We could not read this document." })).toContainText("Reading unavailable");
  expect(await page.locator("#document-file").evaluate(input => (input as HTMLInputElement).files?.length)).toBe(1);
  await page.getByRole("button", { name: "Retry reading" }).click();
  await expect(page.getByText("0 of 4 fields reviewed")).toBeVisible();
  await expect(page.locator('[data-field="usageRateAud"]')).toContainText("30");
  await expect(page.locator('[data-field="usageRateAud"]')).toContainText("c/kWh");
});
test("cancelled extraction cannot restore stale proposals after clearing a document", async ({ page }) => {
  let finish: (() => void) | undefined;
  const pending = new Promise<void>(resolve => { finish = resolve; });
  await page.route("**/api/document-import?**", async route => { await pending; await route.fulfill({ json: fixtureResponse("electricity-bill.pdf") }).catch(() => undefined); });
  await page.getByLabel("Choose a file").setInputFiles(fileURLToPath(new URL("electricity-bill.pdf", folder)));
  await page.getByRole("button", { name: "Read document", exact: true }).click();
  await expect(page.getByText("Reading your document…", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Cancel reading" }).click();
  await page.getByRole("button", { name: "Clear document" }).click();
  finish!();
  await expect(page.getByRole("button", { name: "Read document", exact: true })).toBeDisabled();
  await expect(page.locator("[data-field]")).toHaveCount(0);
});
