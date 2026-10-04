import test from 'node:test';
import assert from 'node:assert/strict';
import { emptyBill, hasCoreBill, type Bill } from '../src/contracts/energy-assistant.ts';
import { evidenceMatches, normalizeBillText, validateExtractedBill } from '../src/server/energy-bill-validation.ts';
import { EnergyError } from '../src/server/energy-diagnostics.ts';
import { checkPdfText } from '../src/server/energy-pdf.ts';
import { extractBill } from '../src/server/energy-assistant.ts';
function raw(bill: Bill) { return { ...bill, usageRateAud: { ...bill.usageRateAud, unit: bill.usageRateAud.value === null ? null : 'AUD' }, supplyDailyAud: { ...bill.supplyDailyAud, unit: bill.supplyDailyAud.value === null ? null : 'AUD' }, tariffComponents: [] }; }
function core() { const b = emptyBill(); b.consumptionKwh = { value: 624, evidence: 'Total electricity usage 624 kWh' }; b.billingDays = { value: 31, evidence: 'Billing period 31 days' }; return b; }
const text = 'SYNTHETIC Electricity bill\nBilling period 31 days\nTotal electricity usage 624 kWh\nCurrent charges $218.40';
const stage = (s: string) => (e: unknown) => e instanceof EnergyError && e.stage === s;
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
