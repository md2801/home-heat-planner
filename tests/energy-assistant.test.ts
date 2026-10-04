import test from "node:test";
import assert from "node:assert/strict";
import { MAX_PDF_BYTES, emptyBill, isBill, isChatRequest, normalizeExtractedRates, validatePdfFile } from "../src/contracts/energy-assistant.ts";
import { billMeasures, billingDays, confirmBill, correctBill, loadChoices, nextQuestion, opportunities, recordAnswer, remember } from "../src/features/energy-assistant/logic.ts";
import { boundedPdfBytes, checkPdfText, readBillPdf, unreadablePdf } from "../src/server/energy-pdf.ts";
import { answerEnergy, extractBill } from "../src/server/energy-assistant.ts";
import type { ChatMessage } from "../src/contracts/energy-assistant.ts";
function fixturePdf(text: string, pages = 1): Uint8Array {
  // Synthetic embedded-text PDF, deliberately containing no real customer data.
  const stream = `BT /F1 6 Tf 40 750 Td (${text.replace(/[()\\]/g, "\\$&")}) Tj ET`;
  const objects = ["<< /Type /Catalog /Pages 2 0 R >>", `<< /Type /Pages /Kids [${Array.from({ length: pages }, (_, i) => `${5 + i} 0 R`).join(" ")}] /Count ${pages} >>`, "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>", `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`, ...Array.from({ length: pages }, () => "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 2000 792] /Resources << /Font << /F1 3 0 R >> >> /Contents 4 0 R >>")];
  let pdf = "%PDF-1.4\n"; const offsets = [0];
  objects.forEach((value, i) => { offsets.push(pdf.length); pdf += `${i + 1} 0 obj\n${value}\nendobj\n`; });
  const xref = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n${offsets.slice(1).map(o => `${String(o).padStart(10, "0")} 00000 n \n`).join("")}trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
  return new TextEncoder().encode(pdf);
}
test("PDF type, empty, size, signature and streamed-byte limits", async () => {
  assert.equal(validatePdfFile({ name: "bill.pdf", type: "application/pdf", size: 100 }), null);
  assert.equal(validatePdfFile({ name: "BILL.PDF", type: "", size: 100 }), null);
  for (const f of [{ name: "bill.png", type: "image/png", size: 100 }, { name: "bill.pdf", type: "text/plain", size: 100 }, { name: "bill.pdf", type: "application/pdf", size: 0 }, { name: "bill.pdf", type: "application/pdf", size: MAX_PDF_BYTES + 1 }]) assert.ok(validatePdfFile(f));
  await assert.rejects(boundedPdfBytes(new Request("http://localhost", { method: "POST", body: "not pdf" })), /valid PDF/);
  await assert.rejects(boundedPdfBytes(new Request("http://localhost", { method: "POST", body: "x".repeat(MAX_PDF_BYTES + 1) })), error => error instanceof Error && "stage" in error && error.stage === "FILE_VALIDATION_FAILED");
});
test("schema preserves missing versus zero and rejects malformed dates, extra fields and invalid numbers", () => {
  const bill = emptyBill(); assert.ok(isBill(bill)); assert.equal(bill.consumptionKwh.value, null);
  bill.consumptionKwh.value = 0; assert.ok(isBill(bill)); assert.equal(billMeasures(confirmBill(bill)).unallocatedKwh, 0);
  assert.equal(isBill({ ...bill, inventedSaving: 10 }), false);
  assert.equal(isBill({ ...bill, periodStart: { value: "2026-02-30", evidence: null } }), false);
  assert.equal(isBill({ ...bill, billingDays: { value: 0, evidence: null } }), false);
  assert.equal(isBill({ ...bill, consumptionKwh: { value: -1, evidence: null } }), false);
  assert.equal(isBill({ ...bill, consumptionKwh: { value: Number.NaN, evidence: null } }), false);
  assert.equal(isBill({ ...bill, provider: { value: null, evidence: "Not actually found" } }), false);
});
test("billing days and daily use are deterministic; unknown input produces no estimate", () => {
  const { bill } = correctBill(emptyBill(), { periodStart: "2026-01-01", periodEnd: "2026-01-31", consumptionKwh: "624" });
  assert.equal(billingDays(bill).value, 31); assert.equal(billMeasures(confirmBill(bill)).kwhPerDay, 624 / 31);
  assert.equal(billingDays(correctBill(bill, { billingDays: "30" }).bill).value, 30);
  assert.equal(billMeasures(confirmBill(emptyBill())).kwhPerDay, null);
  assert.equal(billMeasures(confirmBill(correctBill(bill, { consumptionKwh: "0" }).bill)).kwhPerDay, 0);
  const leap = correctBill(emptyBill(), { periodStart: "2024-02-28", periodEnd: "2024-03-01" }); assert.equal(billingDays(leap.bill).value, 3);
});
test("corrections need confirmation, clear obsolete evidence, and preserve blank versus zero", () => {
  const bill = emptyBill(); bill.consumptionKwh = { value: 624, evidence: "624 kWh" };
  const corrected = correctBill(bill, { consumptionKwh: "0", totalAmountAud: "" });
  assert.deepEqual(corrected.correctedFields, ["consumptionKwh"]); assert.equal(corrected.bill.consumptionKwh.evidence, null); assert.equal(corrected.bill.totalAmountAud.value, null);
  const confirmed = confirmBill(corrected.bill, corrected.correctedFields); assert.equal(confirmed.confirmed, true); assert.equal(bill.consumptionKwh.value, 624);
  assert.throws(() => correctBill(bill, { billingDays: "-1" })); assert.throws(() => correctBill(bill, { periodStart: "2026-03-03", periodEnd: "2026-03-01" }));
});
test("memory retains only ten messages; general workflow rejects bill mode and malformed history", () => {
  let history: ChatMessage[] = []; for (let i = 0; i < 24; i++) history = remember(history, { role: i % 2 ? "user" : "assistant", content: `message ${i}` });
  assert.equal(history.length, 10); assert.equal(history[0]?.content, "message 14"); assert.ok(isChatRequest({ mode: "general", messages: history }));
  assert.equal(isChatRequest({ mode: "bill", messages: history }), false); assert.equal(isChatRequest({ mode: "general", messages: [...history, history[0]] }), false);
});
test("questions adapt to reported loads, don't repeat known or skipped answers, and omit solar question when bill provides it", () => {
  const bill = emptyBill(); assert.equal(nextQuestion({}, bill), "occupancy"); assert.equal(nextQuestion({ occupancy: "Three" }, bill), "loads");
  assert.equal(nextQuestion({ occupancy: "Three", loads: loadChoices[2] }, bill), "dryer");
  assert.equal(nextQuestion({ occupancy: "Three", loads: loadChoices[2], dryer: "Not sure" }, bill), "solar");
  bill.solarExportKwh.value = 0; assert.equal(nextQuestion({ occupancy: "Three", loads: "None" }, bill), "routine");
  assert.equal(nextQuestion({ occupancy: "Three", loads: "None", routine: "Typical", priority: "No idea" }, bill), null);
  assert.equal(nextQuestion({ occupancy: "Three", loads: loadChoices[0], cooling: "Daily", solar: "No", routine: "Typical" }, bill), null);
});
test("unknown appliance use remains unestimated, consumption remains unallocated and absent AC adds no cooling recommendation", () => {
  const bill = correctBill(emptyBill(), { consumptionKwh: "624", billingDays: "31" }).bill;
  const measures = billMeasures(confirmBill(bill)); assert.deepEqual(measures.estimatedLoads, []); assert.equal(measures.unallocatedKwh, 624);
  assert.equal(opportunities({ loads: "None" }).length, 0);
  assert.equal(opportunities({ loads: loadChoices[2], dryer: "Not sure" }).some(o => o.heatLink), false);
  assert.equal(opportunities({ loads: loadChoices[0] })[0]?.title, "Cooling and electric heating");
});
test("real parser extracts synthetic vector text and fails safely for blank/scanned-like, invalid and over-page-limit PDFs", async () => {
  const text = "SYNTHETIC ELECTRICITY BILL AUD current period 1 January to 31 January 2026 31 days total imported electricity 624 kWh current charges 218.40 AUD. No customer details.";
  assert.match(await readBillPdf(fixturePdf(text)), /624 kWh/);
  await assert.rejects(readBillPdf(fixturePdf("")), { message: unreadablePdf });
  await assert.rejects(readBillPdf(fixturePdf(text, 13)), /no more than 12 pages/);
  await assert.rejects(readBillPdf(new TextEncoder().encode("%PDF-corrupt")), /valid PDF/);
  assert.throws(() => checkPdfText(" \n "), { message: unreadablePdf });
});
const providerOutput = (value: unknown) => Response.json({ status: "completed", output: [{ content: [{ type: "output_text", text: JSON.stringify(value) }] }] });
test("server reuses credential conventions and gpt-6-luna strict Responses, rejects unsupported evidence and unsafe prose, and handles unavailable provider", async () => {
  process.env.OPEN_AI_KEY = "synthetic-test-only"; delete process.env.VERCEL;
  const bill = emptyBill(); bill.consumptionKwh = { value: 624, evidence: "624 kWh" }; bill.billingDays = { value: 31, evidence: "31 days" };
  const provider: typeof fetch = async (_url, init) => { const body = JSON.parse(String(init?.body)); assert.equal(body.model, "gpt-6-luna"); assert.equal(body.store, false); assert.equal(body.text.format.strict, true); assert.equal(body.tools, undefined); return providerOutput({ ...bill, usageRateAud: { ...bill.usageRateAud, unit: null }, supplyDailyAud: { ...bill.supplyDailyAud, unit: null } }); };
  assert.deepEqual(await extractBill("Synthetic bill total 624 kWh over 31 days", "extraction", provider), bill);
  await assert.rejects(extractBill("No evidence for claimed value", "bad-evidence", provider), /enough electricity-bill details/);
  assert.equal(await answerEnergy({ mode: "general", messages: [{ role: "user", content: "How can I use the dryer less?" }] }, "chat", async () => providerOutput({ answer: "Try line drying when practical. Check the manual for suitable loads and filter care." })), "Try line drying when practical. Check the manual for suitable loads and filter care.");
  await assert.rejects(answerEnergy({ mode: "general", messages: [{ role: "user", content: "Save money?" }] }, "unsafe", async () => providerOutput({ answer: "Save $200" })), /reliable answer/);
  await assert.rejects(extractBill("Synthetic bill", "outage", async () => { throw new Error("Synthetic outage"); }), /unavailable/);
  process.env.VERCEL = "1"; delete process.env.AI_DISTRIBUTED_LIMITS_CONFIRMED;
  await assert.rejects(extractBill("Synthetic bill", "hosted", provider), /unavailable/);
  delete process.env.VERCEL; delete process.env.OPEN_AI_KEY;
  await assert.rejects(extractBill("Synthetic bill", "no-key", provider), /unavailable/);
});

test("explicit bundled reports avoid repeated context questions; negated/uncertain equipment is not inferred", () => {
  const h = recordAnswer({}, "occupancy", "Three people. We use the dryer daily and have rooftop solar.");
  assert.equal(nextQuestion(h, emptyBill()), "routine");
  assert.equal(opportunities({ loads: "No AC, dryer daily" }).some(o => o.heatLink), false);
  assert.equal(opportunities({ loads: "Maybe air conditioning" }).length, 0);
  assert.equal(opportunities({ loads: loadChoices[0], cooling: "Actually I don't have AC" }).length, 0);
  assert.equal(opportunities({ loads: "We use AC daily and a dryer weekly" }).length, 2);
});

test("printed cents are converted to AUD in TypeScript; ambiguous units don't become a rate", () => {
  const raw = { ...emptyBill(), usageRateAud: { value: 31, evidence: "31 cents/kWh", unit: "cents" }, supplyDailyAud: { value: 85, evidence: "85 cents/day", unit: "cents" } };
  const normalized = normalizeExtractedRates(raw); assert.ok(isBill(normalized));
  assert.equal(normalized.usageRateAud.value, 0.31); assert.equal(normalized.supplyDailyAud.value, 0.85);
  assert.throws(() => normalizeExtractedRates({ ...raw, usageRateAud: { ...raw.usageRateAud, unit: "unknown" } }));
  assert.equal(raw.usageRateAud.value, 31);
});
