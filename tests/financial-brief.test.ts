import test from "node:test";
import assert from "node:assert/strict";
import { emptyAssessment, updateAnswer, answerFor } from "../src/features/assessment/state.ts";
import { questions } from "../src/features/assessment/questions.ts";
import { financialBrief, validBriefSelection } from "../src/features/cooling-options/financial-brief.ts";
import { orderFinancialBrief } from "../src/server/financial-brief.ts";
const cards = financialBrief(emptyAssessment());
process.env.OPEN_AI_KEY = "synthetic-test-only";
delete process.env.VERCEL;
const output = (value: unknown, status = "completed") => Response.json({ status, output: [{ content: [{ type: "output_text", text: JSON.stringify(value) }] }] });
test("unknown baseline remains unknown and brief rejects invented amounts, duplicate and foreign IDs", () => {
  assert.match(cards[0]!.text, /cannot be calculated/);
  assert.equal(validBriefSelection({ ids: ["baseline"] }, cards), true);
  for (const value of [{ ids: ["baseline"], savings: 2000 }, { ids: ["baseline", "baseline"] }, { ids: ["install-now"] }, { ids: [] }]) assert.equal(validBriefSelection(value, cards), false);
});
test("brief follows deterministic scenario changes without turning baseline into savings", () => {
  let draft = emptyAssessment();
  for (const [id,value] of Object.entries({ cooling: ["air-conditioner"], servesOnlyRoom: true, energyBasis: "scenario", averageElectricalInputKw: 1, hoursPerDay: 6, coolingDays: 30, periodDescription: "Synthetic month", flatTariffAudPerKwh: .3 })) {
    const q = questions.find(q => q.id === id)!; draft = updateAnswer(draft,q,answerFor(q,value,"2026-10-03T00:00:00Z"));
  }
  const before = financialBrief(draft)[0]!;
  assert.match(before.text, /54/); assert.match(before.text, /what-if/); assert.match(before.text, /does not establish/);
  const q = questions.find(q => q.id === "hoursPerDay")!;
  draft = updateAnswer(draft,q,answerFor(q,4,"2026-10-03T00:00:00Z"));
  assert.match(financialBrief(draft)[0]!.text, /36/);
});
test("provider can only prioritise computed cards, cache avoids duplicate calls and changed focus calls again", async () => {
  let count = 0;
  const provider: typeof fetch = async (_url, init) => {
    count++; const body = JSON.parse(String(init?.body));
    assert.equal(body.store,false); assert.equal(body.model,"gpt-6-luna"); assert.equal(body.text.format.strict,true);
    assert.deepEqual(body.text.format.schema.properties.ids.items.enum,cards.map(c=>c.id));
    return output({ ids: ["baseline"] });
  };
  assert.equal((await orderFinancialBrief(cards,"understand","a",provider)).ok,true);
  assert.equal((await orderFinancialBrief(cards,"understand","a",provider)).ok,true);
  assert.equal(count,1);
  assert.equal((await orderFinancialBrief(cards,"budget","a",provider)).ok,true);
  assert.equal(count,2);
});
test("fabricated output, incomplete responses, outages and local rate limits retain fallback", async () => {
  const altered = cards.map(c=>({...c,title:c.title+" test"}));
  assert.equal((await orderFinancialBrief(altered,"understand","b",async()=>output({ids:["baseline"],savings:100}))).ok,false);
  assert.equal((await orderFinancialBrief(altered,"budget","b",async()=>output({ids:["baseline"]},"incomplete"))).ok,false);
  assert.equal((await orderFinancialBrief(altered,"next-step","b",async()=>{throw new Error("synthetic outage");})).ok,false);
  let called=false;
  assert.equal((await orderFinancialBrief(altered,"understand","b",async()=>{called=true;return output({ids:["baseline"]});})).ok,false);
  assert.equal(called,false);
});
test("hosting guard and missing credentials prevent provider calls", async () => {
  let called=false;const provider:typeof fetch=async()=>{called=true;return output({ids:["baseline"]});};
  process.env.VERCEL="1";delete process.env.AI_DISTRIBUTED_LIMITS_CONFIRMED;
  assert.equal((await orderFinancialBrief(cards,"understand","c",provider)).ok,false);
  delete process.env.VERCEL;delete process.env.OPEN_AI_KEY;
  assert.equal((await orderFinancialBrief(cards,"understand","c",provider)).ok,false);
  assert.equal(called,false);
});
