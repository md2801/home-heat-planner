import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { emptyBill, hasCoreBill, isBill, type Bill } from '../src/contracts/energy-assistant.ts';
import { billMeasures, confirmBill, correctBill } from '../src/features/energy-assistant/logic.ts';
import { evidenceMatches, normalizeBillText, validateExtractedBill } from '../src/server/energy-bill-validation.ts';
import { EnergyError } from '../src/server/energy-diagnostics.ts';
import { checkPdfText, readBillPdf } from '../src/server/energy-pdf.ts';
import { extractBill } from '../src/server/energy-assistant.ts';
function raw(bill: Bill) { return { ...bill, usageRateAud: { ...bill.usageRateAud, unit: bill.usageRateAud.value === null ? null : 'AUD' }, supplyDailyAud: { ...bill.supplyDailyAud, unit: bill.supplyDailyAud.value === null ? null : 'AUD' }, tariffComponents: [] }; }
function core() { const b = emptyBill(); b.consumptionKwh = { value: 624, evidence: 'Total electricity usage 624 kWh' }; b.billingDays = { value: 31, evidence: 'Billing period 31 days' }; return b; }
const text = 'SYNTHETIC Electricity bill\nBilling period 31 days\nTotal electricity usage 624 kWh\nCurrent charges $218.40';
const stage = (s: string) => (e: unknown) => e instanceof EnergyError && e.stage === s;
// Sanitised relevant lines from the reported selectable-text Bill 1.pdf; no personal identifiers.
const splitBill = `Electricity charges are based on an actual meter reading.
Bill period: 5 March 2023 to 4 April 2023 (31 Days)
Average daily usage 9.03 kWh
Usage and supply charges Time of use Units Price Amount
Peak usage 6am-10pm (Mon-Fri) 200 kWh $0.2500 $50.00
Off peak usage All other times 80 kWh $0.1500 $12.00
Supply charge Daily 31 Days $0.9677 $30.00
Total charges + $92.00
Solar export Time of use Units Price
Standard Feed-in Tariff* At all times 200 kWh $0.05 $10.00 cr`;
function splitCore() {
  const b = emptyBill(); b.billingDays = { value: 31, evidence: 'Bill period: 5 March 2023 to 4 April 2023 (31 Days)' }; return b;
}
function splitRaw() {
  return { ...raw(splitCore()), importRowsComplete: true, tariffComponents: [
    { kind: 'peak', label: 'Peak', consumptionKwh: 200, rateAudPerKwh: .25, rateUnit: 'AUD', amountAud: 50, evidence: 'Peak usage 6am-10pm (Mon-Fri) 200 kWh $0.2500 $50.00' },
    { kind: 'off-peak', label: 'Off-peak', consumptionKwh: 80, rateAudPerKwh: .15, rateUnit: 'AUD', amountAud: 12, evidence: 'Off peak usage All other times 80 kWh $0.1500 $12.00' },
    { kind: 'solar-feed-in', label: 'Solar', consumptionKwh: 200, rateAudPerKwh: .05, rateUnit: 'AUD', amountAud: -10, evidence: 'Standard Feed-in Tariff* At all times 200 kWh $0.05 $10.00 cr' },
  ] };
}
test('reported Bill 1 split-tariff layout reaches review as 280 kWh over 31 days, excluding solar', () => {
  const result = validateExtractedBill(splitRaw(), splitBill);
  assert.equal(result.consumptionKwh.value, 280); assert.equal(result.billingDays.value, 31); assert.ok(hasCoreBill(result));
  assert.deepEqual(result.consumptionCalculation, { method: 'sum-import-rows', componentIndexes: [0, 1] });
  assert.equal(result.consumptionKwh.evidence, null);
  for (const index of result.consumptionCalculation!.componentIndexes) assert.ok(evidenceMatches(splitBill, result.tariffComponents![index]!.evidence));
  assert.equal(result.provider.value, null); assert.equal(result.supplyDailyAud.value, null);
});
test('calculated import provenance survives confirmation and clears when the user corrects consumption', () => {
  const bill = validateExtractedBill(splitRaw(), splitBill);
  assert.deepEqual(confirmBill(bill).bill.consumptionCalculation, { method: 'sum-import-rows', componentIndexes: [0, 1] });
  const corrected = correctBill(bill, { consumptionKwh: '279' });
  assert.equal(corrected.bill.consumptionCalculation, undefined);
  assert.equal(corrected.bill.consumptionKwh.evidence, null);
  assert.deepEqual(corrected.correctedFields, ['consumptionKwh']);
});
test('an unsupported model total cannot bypass deterministic supported-row arithmetic', () => {
  const value = splitRaw(); value.consumptionKwh = { value: 999, evidence: 'Peak usage 6am-10pm (Mon-Fri) 200 kWh $0.2500 $50.00' };
  assert.equal(validateExtractedBill(value, splitBill).consumptionKwh.value, 280);
  assert.equal(validateExtractedBill({ ...value, importRowsComplete: false }, splitBill).consumptionKwh.value, null);
});
test('messy split-tariff source whitespace preserves supported import and explicit zero', () => {
  assert.equal(validateExtractedBill(splitRaw(), splitBill.replaceAll(' ', '\t\u00a0').replaceAll('\n', '\r\n')).consumptionKwh.value, 280);
  const value = splitRaw();
  value.tariffComponents[0]!.consumptionKwh = 0; value.tariffComponents[0]!.evidence = value.tariffComponents[0]!.evidence.replace('200 kWh', '0 kWh');
  value.tariffComponents[1]!.consumptionKwh = 0; value.tariffComponents[1]!.evidence = value.tariffComponents[1]!.evidence.replace('80 kWh', '0 kWh');
  assert.equal(validateExtractedBill(value, splitBill.replace('200 kWh $0.2500', '0 kWh $0.2500').replace('80 kWh', '0 kWh')).consumptionKwh.value, 0);
});
for (const kind of ['missing table footer', 'unsupported import row', 'duplicate rows', 'multiple tables', 'export-only table'] as const) test(`${kind} remains reviewable without establishing an imported total`, () => {
  const value = splitRaw(); let source = splitBill;
  if (kind === 'missing table footer') { source = source.replace('Total charges + $92.00', 'Unfinished table'); value.importRowsComplete = false; }
  if (kind === 'unsupported import row') value.tariffComponents.push({ ...value.tariffComponents[0]!, kind: 'shoulder', evidence: 'Invented Shoulder 40 kWh', consumptionKwh: 40 });
  if (kind === 'duplicate rows') value.tariffComponents.push({ ...value.tariffComponents[0]! });
  if (kind === 'multiple tables') { source += '\n' + splitBill; value.importRowsComplete = false; }
  if (kind === 'export-only table') value.tariffComponents = [value.tariffComponents[2]!];
  const bill = validateExtractedBill(value, source);
  assert.equal(bill.consumptionKwh.value, null); assert.equal(bill.consumptionCalculation, undefined); assert.ok(isBill(bill));
});
test('a complete import table with no supported billing period remains reviewable with unknown daily use', () => {
  const value = splitRaw(); value.billingDays = { value: null, evidence: null };
  const bill = validateExtractedBill(value, splitBill);
  assert.equal(bill.consumptionKwh.value, 280); assert.equal(hasCoreBill(bill), false);
  assert.equal(billMeasures(confirmBill(bill)).kwhPerDay, null);
});
test('split-tariff structured extraction with a null total succeeds through the current service', async () => {
  process.env.OPEN_AI_KEY = 'synthetic-test-only'; delete process.env.VERCEL;
  try {
    const bill = await extractBill(splitBill, 'split-table-regression', async (_url, init) => {
      const request = JSON.parse(String(init?.body)); assert.equal(request.model, 'gpt-6-luna'); assert.equal(request.store, false);
      assert.ok(request.text.format.schema.required.includes('importRowsComplete'));
      return Response.json({ status: 'completed', output: [{ content: [{ type: 'output_text', text: JSON.stringify(splitRaw()) }] }] });
    });
    assert.equal(bill.consumptionKwh.value, 280); assert.equal(bill.billingDays.value, 31);
  } finally { delete process.env.OPEN_AI_KEY; }
});
test('existing selectable-text electricity PDF passes; non-electricity PDF cannot support invented core evidence', async () => {
  const billText = await readBillPdf(new Uint8Array(await readFile(new URL('./fixtures/document-import/electricity-bill.pdf', import.meta.url))));
  const b = emptyBill();
  b.consumptionKwh = { value: 650, evidence: 'Whole-home consumption: 650 kWh' };
  b.periodStart = { value: '2026-09-01', evidence: 'Billing period: 01/09/2026 to 30/09/2026' };
  b.periodEnd = { value: '2026-09-30', evidence: b.periodStart.evidence };
  assert.ok(hasCoreBill(validateExtractedBill(raw(b), billText)));
  const quote = await readBillPdf(new Uint8Array(await readFile(new URL('./fixtures/document-import/incomplete-quote.pdf', import.meta.url))));
  assert.throws(() => validateExtractedBill(raw(b), quote), stage('BILL_CORE_FIELDS_INSUFFICIENT'));
});
test('clean Australian single-rate bill extracts cents and currency without guessing', () => {
  const b = core(); b.totalAmountAud = { value: 218.40, evidence: 'Current charges $218.40' };
  const r = raw(b); r.usageRateAud = { value: 31, evidence: 'General usage 31 c/kWh', unit: 'cents' };
  const result = validateExtractedBill(r, text + '\nGeneral usage 31 c/kWh');
  assert.equal(result.usageRateAud.value, .31); assert.equal(result.totalAmountAud.value, 218.40);
});
test('messy embedded text tolerates whitespace and control characters while preserving digits', () => {
  const messy = text.replaceAll(' ', '\t \u00a0').replaceAll('\n', '\r\n\n\n');
  assert.ok(hasCoreBill(validateExtractedBill(raw(core()), normalizeBillText(messy))));
  assert.equal(normalizeBillText('31\u000085'), '31 85'); assert.equal(evidenceMatches('624 kWh', '642 kWh'), false);
});
test('reordered multi-column text does not require clean prose or reorder evidence tokens', () => {
  assert.ok(hasCoreBill(validateExtractedBill(raw(core()), 'Current charges $218.40\nTotal electricity usage 624 kWh\nRetailer header\nBilling period 31 days')));
  assert.equal(evidenceMatches('624\nkWh\nUsage', 'Usage 624 kWh'), false);
});
for (const missing of ['usageRateAud', 'supplyDailyAud', 'provider'] as const) test(`missing optional ${missing} proceeds with unknown`, () => {
  const result = validateExtractedBill(raw(core()), text); assert.equal(result[missing].value, null); assert.ok(hasCoreBill(result));
});
test('core-only bill succeeds; explicit dates can supply period instead of days', () => {
  assert.ok(hasCoreBill(validateExtractedBill(raw(core()), text)));
  const b = core(); b.billingDays = { value: null, evidence: null }; b.periodStart = { value: '2026-09-01', evidence: 'From 1 Sep 2026' }; b.periodEnd = { value: '2026-09-30', evidence: 'To 30 Sep 2026' };
  assert.ok(hasCoreBill(validateExtractedBill(raw(b), text + '\nFrom 1 Sep 2026\nTo 30 Sep 2026')));
});
test('whitespace-only optional retailer evidence no longer rejects whole bill', () => {
  const b = core(); b.provider = { value: 'Synthetic Energy', evidence: 'Synthetic Energy Electricity' };
  assert.equal(validateExtractedBill(raw(b), text + '\nSynthetic Energy\nElectricity').provider.value, 'Synthetic Energy');
});
test('unsupported optional evidence becomes unknown; unsupported core does not proceed', () => {
  const b = core(); b.provider = { value: 'Invented', evidence: 'not in bill' };
  assert.equal(validateExtractedBill(raw(b), text).provider.value, null);
  assert.throws(() => validateExtractedBill(raw(b), 'Synthetic non-electricity travel invoice'), stage('BILL_CORE_FIELDS_INSUFFICIENT'));
});
for (const solar of [null, 0, 120]) test(`solar export ${solar} preserves absence versus explicit values`, () => {
  const b = core(); let source = text;
  if (solar !== null) { b.solarExportKwh = { value: solar, evidence: `Solar export ${solar} kWh` }; source += `\nSolar export ${solar} kWh`; b.feedInCreditAud = { value: solar === 0 ? 0 : 6, evidence: `Feed-in credit $${solar === 0 ? '0.00' : '6.00'}` }; source += '\n' + b.feedInCreditAud.evidence; }
  assert.equal(validateExtractedBill(raw(b), source).solarExportKwh.value, solar);
});
test('peak, shoulder, off-peak and controlled load retain separate rates; never averaged', () => {
  const b = core(); b.usageRateAud = { value: .25, evidence: 'Usage 0.25 AUD/kWh' };
  const tariffs = ['peak', 'shoulder', 'off-peak', 'controlled-load'].map((kind, i) => ({ kind, label: kind, rateAudPerKwh: 20 + i, rateUnit: 'cents', consumptionKwh: null, amountAud: null, evidence: `${kind} ${20 + i} c/kWh` }));
  const result = validateExtractedBill({ ...raw(b), tariffComponents: tariffs }, text + '\nUsage 0.25 AUD/kWh\n' + tariffs.map(t => t.evidence).join('\n'));
  assert.equal(result.usageRateAud.value, null); assert.deepEqual(result.tariffComponents?.map(t => t.rateAudPerKwh), [.2, .21, .22, .23]);
});
test('solar feed-in component remains distinct from imported consumption', () => {
  const t = { kind: 'solar-feed-in', label: 'Feed-in', rateAudPerKwh: 5, rateUnit: 'cents', consumptionKwh: 120, amountAud: -6, evidence: 'Feed-in 120 kWh at 5 c/kWh credit $6.00' };
  const result = validateExtractedBill({ ...raw(core()), tariffComponents: [t] }, text + '\n' + t.evidence);
  assert.equal(result.consumptionKwh.value, 624); assert.equal(result.tariffComponents?.[0]?.rateAudPerKwh, .05);
});
const itemisedRows = (): { kind: string; label: string; rateAudPerKwh: number; rateUnit: string; consumptionKwh: number | null; amountAud: number; evidence: string }[] => [
  { kind: 'peak', label: 'Peak', rateAudPerKwh: 30, rateUnit: 'cents', consumptionKwh: 200, amountAud: 60, evidence: 'Peak 200 kWh at 30 c/kWh $60.00' },
  { kind: 'off-peak', label: 'Off-peak', rateAudPerKwh: 20, rateUnit: 'cents', consumptionKwh: 80, amountAud: 16, evidence: 'Off-peak 80 kWh at 20 c/kWh $16.00' },
  { kind: 'solar-feed-in', label: 'Solar', rateAudPerKwh: 5, rateUnit: 'cents', consumptionKwh: 200, amountAud: -10, evidence: 'Solar 200 kWh at 5 c/kWh credit $10.00' },
];
function itemised() {
  const b = core(); b.consumptionKwh = { value: null, evidence: null };
  const rows = itemisedRows();
  return { value: { ...raw(b), importRowsComplete: true, tariffComponents: rows }, source: 'Electricity bill\nBilling period 31 days\n' + rows.map(row => row.evidence).join('\n') };
}
test('itemised import rows are added in code with provenance, excluding solar and preserving separate rates', () => {
  const { value, source } = itemised(), bill = validateExtractedBill(value, source);
  assert.equal(bill.consumptionKwh.value, 280); assert.equal(bill.consumptionKwh.evidence, null);
  assert.deepEqual(bill.consumptionCalculation, { method: 'sum-import-rows', componentIndexes: [0, 1] });
  assert.equal(bill.usageRateAud.value, null); assert.ok(isBill(bill));
  assert.equal(billMeasures(confirmBill(bill)).kwhPerDay, 280 / 31);
  const corrected = correctBill(bill, { consumptionKwh: '290' });
  assert.equal(corrected.bill.consumptionCalculation, undefined); assert.deepEqual(corrected.correctedFields, ['consumptionKwh']);
  assert.equal(isBill({ ...bill, consumptionKwh: { value: 480, evidence: null } }), false);
  assert.equal(isBill({ ...bill, consumptionCalculation: { method: 'sum-import-rows', componentIndexes: [0, 1, 2] } }), false);
});
test('incomplete or ambiguous import rows remain reviewable without inventing a total', () => {
  for (const kind of ['incomplete', 'duplicate', 'missing', 'other', 'unsupported', 'wrong-number', 'aggregate']) {
    const { value, source } = itemised();
    if (kind === 'incomplete') value.importRowsComplete = false;
    if (kind === 'duplicate') value.tariffComponents.push({ ...value.tariffComponents[0]! });
    if (kind === 'missing') value.tariffComponents[0]!.consumptionKwh = null;
    if (kind === 'other') value.tariffComponents[0]!.kind = 'other';
    if (kind === 'unsupported') value.tariffComponents[0]!.evidence = 'Invented Peak 999 kWh';
    if (kind === 'wrong-number') value.tariffComponents[0]!.consumptionKwh = 999;
    if (kind === 'aggregate') value.tariffComponents[0]!.kind = 'anytime';
    const bill = validateExtractedBill(value, source);
    assert.equal(bill.consumptionKwh.value, null, kind); assert.equal(bill.consumptionCalculation, undefined, kind);
  }
});
test('an explicit total takes precedence and the provider cannot claim a calculation', () => {
  const { value, source } = itemised(); value.consumptionKwh = { value: 300, evidence: 'Total import 300 kWh' };
  assert.equal(validateExtractedBill(value, source + '\nTotal import 300 kWh').consumptionKwh.value, 300);
  assert.throws(() => validateExtractedBill({ ...value, consumptionCalculation: { method: 'sum-import-rows', componentIndexes: [0, 1] } }, source), stage('BILL_SCHEMA_INVALID'));
});
test('empty and scanned-like text report no digital text, not provider failure', () => {
  assert.throws(() => checkPdfText(''), stage('PDF_TEXT_EMPTY')); assert.throws(() => checkPdfText('Logo'), stage('PDF_TEXT_INSUFFICIENT'));
});
test('malformed bill schema and ambiguous rate unit are distinct', () => {
  assert.throws(() => validateExtractedBill({ ...raw(core()), consumptionKwh: { value: '624', evidence: '624 kWh' } }, text), stage('BILL_SCHEMA_INVALID'));
  assert.throws(() => validateExtractedBill({ ...raw(core()), usageRateAud: { value: 31, evidence: '31', unit: null } }, text), stage('BILL_NORMALISATION_FAILED'));
});
test('provider outage, malformed JSON, refusal and incomplete output have distinct stages', async () => {
  process.env.OPEN_AI_KEY = 'synthetic-test-only'; delete process.env.VERCEL;
  await assert.rejects(extractBill(text, 'regression-outage', async () => { throw new Error('no network'); }), stage('OPENAI_REQUEST_FAILED'));
  await assert.rejects(extractBill(text, 'regression-json', async () => Response.json({ status: 'completed', output: [{ content: [{ type: 'output_text', text: '{broken' }] }] })), stage('OPENAI_STRUCTURED_OUTPUT_INVALID'));
  await assert.rejects(extractBill(text, 'regression-refusal', async () => Response.json({ status: 'completed', output: [{ content: [{ type: 'refusal', refusal: 'no' }] }] })), stage('OPENAI_REFUSAL'));
  await assert.rejects(extractBill(text, 'regression-incomplete', async () => Response.json({ status: 'incomplete', output: [] })), stage('OPENAI_INCOMPLETE'));
  delete process.env.OPEN_AI_KEY;
});
