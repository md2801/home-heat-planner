import test from 'node:test';
import assert from 'node:assert/strict';
import { emptyBill, isChatRequest } from '../src/contracts/energy-assistant.ts';
import { billMeasures, confirmBill, hasLoad, isUnknownAnswer, loadChoices, nextQuestion, opportunities, type Household } from '../src/features/energy-assistant/logic.ts';
import { answerConversation, checkAnswer, questionText, startConversation, type BillConversation } from '../src/features/energy-assistant/conversation.ts';
const bill = emptyBill(); bill.billingDays.value = 31; bill.consumptionKwh.value = 280;
const loads = [loadChoices[1], loadChoices[2], loadChoices[5]].join('; ');
function advance(s: BillConversation, h: Household, value: string, units = true) { return answerConversation(s, h, bill, value, units); }
test('normal adaptive flow uses exactly five substantive slots, including one-unit refrigeration correction', () => {
  let s = startConversation({}, bill), h: Household = {};
  for (const value of ['1', loads, 'Heat-pump hot water', '5', '1']) { const r = advance(s, h, value); s = r.state; h = r.household; }
  assert.equal(s.current, null); assert.deepEqual(s.asked, ['occupancy', 'loads', 'hotWater', 'dryer', 'refrigeration']);
  assert.equal(h.dryer, 'Approximately 5 dryer cycles during the 31-day billing period.');
  assert.equal(opportunities(h).find(o => o.title === 'Refrigeration')?.priority, 'Not enough evidence to prioritise');
});
test('clarification does not consume a slot or store non-responsive hot-water fact', () => {
  const h = { occupancy: 'One', loads }; const s = startConversation(h, bill, ['occupancy', 'loads']);
  const result = advance(s, h, 'I live in an apartment');
  assert.equal(result.state.asked.length, 3); assert.equal(result.state.current, 'hotWater'); assert.equal(result.household.hotWater, undefined);
  assert.match(result.reply, /centrally/); assert.doesNotMatch(JSON.stringify(result.household), /apartment/);
});
test('at most one clarification, then uncertain answer becomes unknown and moves on', () => {
  const h = { occupancy: 'One', loads }, s = startConversation(h, bill, ['occupancy', 'loads']);
  const first = advance(s, h, 'Apartment'); const second = advance(first.state, first.household, 'Living on the third floor');
  assert.equal(second.household.hotWater, 'Unknown'); assert.equal(second.state.current, 'dryer'); assert.equal(second.state.asked.length, 4); assert.equal(second.state.clarification, null);
});
test('I don’t know after clarification becomes unknown without another attempt', () => {
  const h = { occupancy: 'One', loads }, first = advance(startConversation(h, bill, ['occupancy', 'loads']), h, 'I live in an apartment');
  const result = advance(first.state, first.household, "I don't know"); assert.equal(result.household.hotWater, 'Unknown'); assert.equal(result.state.current, 'dryer');
});
test('skip immediately becomes unknown and is not asked again', () => {
  const result = advance(startConversation({}, bill), {}, "I don't know"); assert.equal(result.household.occupancy, 'Unknown'); assert.equal(result.state.current, 'loads');
});
test('legacy ambiguous numeric frequency is clarified and Yes confirms the proposed units', () => {
  const h = { occupancy: 'One', loads: loadChoices[2] }, s = startConversation(h, bill, ['occupancy', 'loads']);
  const first = advance(s, h, '5', false); assert.equal(first.state.current, 'dryer'); assert.match(first.reply, /5 dryer cycles.*31-day/); assert.equal(first.state.asked.length, 3);
  const second = advance(first.state, first.household, 'Yes'); assert.match(second.household.dryer!, /5 dryer cycles/); assert.equal(second.state.asked.length, 4);
});
test('number accepted when original dryer question explicitly establishes cycles and period', () => {
  assert.match(questionText('dryer', bill), /cycles.*31-day/); assert.equal(checkAnswer('dryer', '5', bill).kind, 'usable');
  assert.equal(checkAnswer('dryer', '5', bill, false).kind, 'ambiguous'); assert.equal(checkAnswer('dryer', '5 hours', bill).kind, 'ambiguous'); assert.equal(checkAnswer('dryer', '5 cycles', bill).kind, 'usable');
});
test('non-responsive hot-water answer never becomes a system fact', () => {
  assert.equal(checkAnswer('hotWater', 'living in apartment', bill).kind, 'non-responsive');
  assert.equal(checkAnswer('hotWater', 'Electric storage tank, usually overnight', bill).kind, 'usable');
});
test('one normal total unit does not become extra refrigeration', () => {
  const result = checkAnswer('refrigeration', '1', bill); const rows = opportunities({ loads: loadChoices[5], refrigeration: result.value! });
  assert.equal(rows[0]?.title, 'Refrigeration'); assert.equal(rows[0]?.priority, 'Not enough evidence to prioritise'); assert.match(rows[0]?.why ?? '', /One normal/);
});
test('explicit secondary unit or multiple total units can justify refrigeration review', () => {
  for (const value of ['A secondary fridge in the garage', '2']) {
    const answer = checkAnswer('refrigeration', value, bill); assert.equal(answer.kind, 'usable');
    assert.equal(opportunities({ loads: loadChoices[5], refrigeration: answer.value! })[0]?.title, 'Extra refrigeration');
  }
});
test('mixed fridge/freezer counts are not silently reduced to one unit', () => {
  assert.equal(checkAnswer('refrigeration', 'one fridge and one freezer', bill).kind, 'non-responsive');
});
test('appliances reported absent are not questioned or recommended', () => {
  const h = { occupancy: 'One', loads: 'No AC; Clothes dryer', dryer: '5 cycles per week' };
  assert.notEqual(nextQuestion(h, bill), 'cooling'); assert.equal(opportunities(h).some(o => o.heatLink), false);
  assert.equal(hasLoad({ loads: loadChoices[0], cooling: "I don't have it" }, loadChoices[0]), false);
});
test('known solar bill fields and known answers are not repeated', () => {
  const solarBill = structuredClone(bill); solarBill.solarExportKwh.value = 0;
  assert.equal(nextQuestion({ occupancy: 'One', loads: loadChoices[2], dryer: '5 cycles per week' }, solarBill), 'routine');
});
test('question cap is independent of inferred household fields', () => {
  const h = { occupancy: 'One', loads, solar: 'No', dryer: 'Weekly', refrigeration: '2 units' };
  assert.equal(startConversation(h, bill, ['occupancy', 'loads']).current, 'hotWater');
  assert.equal(nextQuestion({}, bill, 5), null);
});
test('five slots cannot grow through repeated unclear clarification replies', () => {
  let h: Household = {}, s = startConversation(h, bill); let turns = 0;
  while (s.current && turns++ < 20) { const r = advance(s, h, 'purple carpet'); s = r.state; h = r.household; }
  assert.ok(turns <= 10); assert.ok(s.asked.length <= 5); assert.equal(s.current, null);
});
test('final investigation distinguishes selected equipment from unknown details', () => {
  const rows = opportunities({ loads, hotWater: 'Unknown', dryer: 'Approximately 5 dryer cycles during the 31-day billing period.', refrigeration: '1 fridges/freezers in total.' });
  assert.equal(rows[0]?.title, 'Electric hot water'); assert.equal(rows[0]?.priority, 'Needs clarification'); assert.equal(rows[0]?.reported, 'You selected electric hot water.');
  assert.match(rows[0]?.unknown ?? '', /remain unknown/); assert.equal(rows[1]?.priority, 'Worth reviewing'); assert.equal(rows[2]?.priority, 'Not enough evidence to prioritise');
  assert.ok(rows.every(r => !!r.why && !!r.unknown && !!r.action)); assert.equal(isUnknownAnswer('Unknown'), true);
});
test('final qualitative priorities do not assign kWh or invent savings/payback', () => {
  const rows = opportunities({ loads, hotWater: 'Heat pump', dryer: '5 cycles during this period', refrigeration: '2 units' });
  const measures = billMeasures(confirmBill(bill)); assert.equal(measures.unallocatedKwh, 280); assert.deepEqual(measures.estimatedLoads, []);
  for (const row of rows) assert.doesNotMatch(row.why + row.unknown + row.action, /\d|\$|%|payback|save money|annual savings/i);
});
test('useful investigation is prioritised over routine dishwasher and normal refrigeration', () => {
  const rows = opportunities({ loads: loadChoices.join('; '), hotWater: 'Unknown', cooling: '6 hours per day', refrigeration: '1 fridges/freezers in total.' });
  assert.equal(rows.length, 3); assert.equal(rows[0]?.title, 'Electric hot water'); assert.equal(rows.some(r => r.title === 'Dishwashing' || r.title === 'Extra refrigeration'), false);
});
test('general chat remains a separate contract from bill household state', () => {
  assert.equal(isChatRequest({ mode: 'general', messages: [{ role: 'user', content: 'How can I use my dryer less?' }] }), true);
  assert.equal(isChatRequest({ mode: 'bill', messages: [{ role: 'user', content: '5' }] }), false);
});

test('no filler priority question when no major loads were reported', () => {
  const b = structuredClone(bill); b.solarExportKwh.value = 0;
  assert.equal(nextQuestion({ occupancy: 'One', loads: 'None of these', routine: 'Typical' }, b, 3), null);
});

test('bundled system mentions do not bypass question-specific validation', () => {
  const result = advance(startConversation({}, bill), {}, 'Three people. Electric hot water daily. Dryer weekly.');
  assert.equal(result.household.hotWater, undefined);
  assert.match(result.household.dryer ?? '', /Dryer weekly/);
  assert.equal(result.state.current, 'hotWater');
});
test('reported gas hot water corrects earlier electric selection', () => {
  assert.equal(hasLoad({ loads: loadChoices[1], hotWater: 'Gas hot water' }, loadChoices[1]), false);
});
