import test from "node:test";
import assert from "node:assert/strict";
import { emptyBill } from "../src/contracts/energy-assistant.ts";
import { isEnergyAnalysisInput, type EnergyAdvice, type EnergyAnalysisInput } from "../src/contracts/energy-analysis.ts";
import { confirmBill, correctBill } from "../src/features/energy-assistant/logic.ts";
import { analyseEnergyBill } from "../src/server/energy-assistant.ts";

const billText = "SYNTHETIC electricity bill. Billing period 31 days. Total imported 280 kWh. Meter reading: estimated. Peak rate 30 c/kWh. Supply charge 100 cents/day.";
const input: EnergyAnalysisInput = { billText, confirmed: confirmBill(correctBill(emptyBill(), { consumptionKwh: "280", billingDays: "31" }).bill, ["consumptionKwh", "billingDays"]), household: { occupancy: "Two", loads: "Clothes dryer", dryer: "Several cycles in the billing period" } };
const advice = (): EnergyAdvice => ({ summary: "The bill uses an estimated meter reading. Check it against your meter before drawing conclusions about your habits.", billNotes: [{ title: "Estimated reading", explanation: "Your retailer used an estimate, so the usage may need checking.", evidence: "Meter reading: estimated." }], recommendations: [{ title: "Try air drying", reason: "You reported using a clothes dryer. Air drying can reduce electricity demand when practical.", action: "Try a drying rack or clothesline when conditions allow.", check: "Use a suitable ventilated space and check care labels.", techniqueId: "line-dry" }], uncertainties: ["The bill does not measure the dryer separately."] });
const output = (value: unknown) => Response.json({ status: "completed", output: [{ content: [{ type: "output_text", text: JSON.stringify(value) }] }] });

test("analysis input requires confirmed data and bounded full-document context", () => {
  assert.ok(isEnergyAnalysisInput(input));
  assert.equal(isEnergyAnalysisInput({ ...input, billText: "x".repeat(48001) }), false);
  assert.equal(isEnergyAnalysisInput({ ...input, confirmed: { ...input.confirmed, confirmed: false } }), false);
  assert.equal(isEnergyAnalysisInput({ ...input, household: { invented: "value" } }), false);
  assert.equal(isEnergyAnalysisInput({ ...input, confirmed: { ...input.confirmed, correctedFields: ["fake"] } }), false);
});
test("whole-bill analysis receives original text, corrections, household context and calculated measures", async () => {
  process.env.OPEN_AI_KEY = "synthetic-test-only"; delete process.env.VERCEL;
  try {
    const result = await analyseEnergyBill(input, "analysis-context", async (_url, options) => {
      const request = JSON.parse(String(options?.body));
      const context = JSON.parse(request.input[1].content);
      assert.equal(context.billText, billText); assert.deepEqual(context.household, input.household);
      assert.deepEqual(context.correctedFields, ["consumptionKwh", "billingDays"]);
      assert.equal(context.calculatedMeasures.kwhPerDay, 280 / 31); assert.equal(context.acReported, false);
      assert.ok(context.guidance.every((t: { id: string }) => t.id !== "comfortable-setting"));
      assert.match(request.input[0].content, /Read ALL supplied bill text/);
      assert.equal(request.model, "gpt-6-luna"); assert.equal(request.store, false);
      return output(advice());
    });
    assert.equal(result.billNotes[0]?.title, "Estimated reading");
    for (const issue of ["excerpt", "numbers", "ac", "source", "extra"]) {
      const invalid = advice();
      if (issue === "excerpt") invalid.billNotes[0]!.evidence = "Invented bill content";
      if (issue === "numbers") invalid.summary = "You will save $500";
      if (issue === "ac") invalid.recommendations[0]!.action = "Replace your AC";
      if (issue === "source") invalid.recommendations[0]!.techniqueId = "invented-guide";
      await assert.rejects(analyseEnergyBill(input, `analysis-${issue}`, async () => output(issue === "extra" ? { ...invalid, secret: true } : invalid)));
    }
  } finally { delete process.env.OPEN_AI_KEY; }
});
