import { billFields, isBill, MEMORY_LIMIT, type Bill, type BillKey, type ChatMessage, type ConfirmedBill } from "../../contracts/energy-assistant.ts";
export function remember(messages: ChatMessage[], message: ChatMessage): ChatMessage[] { return [...messages, message].slice(-MEMORY_LIMIT); }
export function billingDays(bill: Bill): { value: number | null; basis: string } {
  if (bill.billingDays.value !== null) return { value: bill.billingDays.value, basis: "Confirmed billing-day count" };
  const start = bill.periodStart.value, end = bill.periodEnd.value;
  if (!start || !end || start > end) return { value: null, basis: "Billing period unknown" };
  const days = (Date.parse(end) - Date.parse(start)) / 86400000 + 1;
  return days <= 730 ? { value: days, basis: "Calculated from confirmed dates, counting both start and end dates; check your bill's convention" } : { value: null, basis: "Billing period needs checking" };
}
export function billMeasures(confirmed: ConfirmedBill) {
  const period = billingDays(confirmed.bill), kwh = confirmed.bill.consumptionKwh.value;
  return { days: period.value, daysBasis: period.basis, kwhPerDay: kwh !== null && period.value !== null ? kwh / period.value : null, unallocatedKwh: kwh, estimatedLoads: [] };
}
export function correctBill(bill: Bill, edits: Partial<Record<BillKey, string>>, previous: BillKey[] = []): { bill: Bill; correctedFields: BillKey[] } {
  const next = structuredClone(bill), corrected = new Set(previous);
  for (const k of Object.keys(edits) as BillKey[]) {
    if (!(k in billFields)) throw new Error("Unknown bill field");
    const raw = edits[k]!.trim();
    const value = raw === "" ? null : billFields[k].type === "number" ? Number(raw) : raw;
    if (value === bill[k].value) continue;
    // Assignment crosses a mapped field type; the complete object is validated below.
    (next[k] as { value: string | number | null; evidence: string | null }).value = value;
    next[k].evidence = null; corrected.add(k);
  }
  if (!isBill(next)) throw new Error("Check dates and numbers. Billing days must be a positive whole number; blank means unknown.");
  return { bill: next, correctedFields: [...corrected] };
}
export function confirmBill(bill: Bill, correctedFields: BillKey[] = []): ConfirmedBill {
  if (!isBill(bill)) throw new Error("Check the bill details before confirming.");
  return { bill: structuredClone(bill), correctedFields: [...correctedFields], confirmed: true };
}
export const loadChoices = ["Air conditioning / electric heating", "Electric hot water", "Clothes dryer", "Pool / spa pump", "EV charging", "Extra fridges / freezers", "Dishwasher"] as const;
export type QuestionId = "occupancy" | "loads" | "cooling" | "hotWater" | "dryer" | "pool" | "ev" | "refrigeration" | "solar" | "routine" | "priority";
export type Household = Partial<Record<QuestionId, string>>;
export const questionTitles: Record<QuestionId, string> = {
  occupancy: "How many people normally live in the home?", loads: "Which major electrical loads do you regularly use? Select all that apply, or tell me in your own words.",
  cooling: "On days you used air conditioning or electric heating during the bill period, about how many hours per day did it run?",
  hotWater: "What type of electric hot-water system do you have, and do you know when it heats?",
  dryer: "About how many dryer cycles did you run during the confirmed billing period?", pool: "About how many hours per day does your pool or spa pump usually run?",
  ev: "About how many charging sessions per week did you do at home during the bill period?", refrigeration: "How many fridges and freezers run regularly in your home in total, including the main kitchen unit? Are any additional units rarely needed?",
  solar: "Do you have rooftop solar? The bill didn't clearly identify exports.", routine: "Was this a typical period, or were there changes such as visitors or more time at home?",
  priority: "Which reported load or household habit would you most like to understand first?",
};
const loadAliases: Record<typeof loadChoices[number], RegExp> = {
  "Air conditioning / electric heating": /\b(?:ac|air[- ]?con(?:ditioning|ditioner)?|electric heat(?:ing|er))\b/i,
  "Electric hot water": /\belectric hot[- ]water\b/i,
  "Clothes dryer": /\b(?:clothes dryer|dryer)\b/i,
  "Pool / spa pump": /\b(?:pool|spa) pump\b/i,
  "EV charging": /\b(?:ev charging|charge (?:an? |my |our )?(?:ev|electric car))\b/i,
  "Extra fridges / freezers": /\b(?:extra|additional|secondary|second|spare|multiple|two|three) (?:fridges?|freezers?)\b/i,
  "Dishwasher": /\bdishwasher\b/i,
};
export const detailForLoad: Partial<Record<typeof loadChoices[number], QuestionId>> = {
  [loadChoices[0]]: "cooling", [loadChoices[1]]: "hotWater", [loadChoices[2]]: "dryer", [loadChoices[3]]: "pool", [loadChoices[4]]: "ev", [loadChoices[5]]: "refrigeration",
};
const clauses = (text: string) => text.split(/[.;,]|\bbut\b|\band\b/i);
const uncertainOrNegative = /\b(?:no|not|never|without|unsure|unknown|maybe|might|perhaps|don't|dont|do not|don't have|not sure)\b/i;
export function hasLoad(h: Household, load: typeof loadChoices[number]): boolean {
  const detail = h[detailForLoad[load] as QuestionId] ?? "";
  if (load === loadChoices[1] && /\bgas hot[- ]water\b/i.test(detail)) return false;
  if (/\b(?:don[’']?t have|do not have|do not own|no longer have|don[’']?t own)\b/i.test(detail)) return false;
  // Explicit corrections such as “I don't have AC” override the earlier selection.
  if (clauses(detail).some(c => loadAliases[load].test(c) && /\b(?:no|don't have|do not have|without)\b/i.test(c))) return false;
  if ((h.loads ?? "").split("; ").includes(load)) return true;
  return clauses(h.loads ?? "").some(c => loadAliases[load].test(c) && !uncertainOrNegative.test(c));
}
/** Preserve raw reports, and recognise only explicit contextual answers supplied together. No power or usage is inferred. */
export function recordAnswer(h: Household, question: QuestionId, value: string): Household {
  const next = { ...h, [question]: value.trim().slice(0, 1000) };
  if (question !== "loads" && next.loads === undefined && loadChoices.some(load => hasLoad({ loads: value }, load))) next.loads = value;
  if (next.solar === undefined && /\b(?:have|has) (?:rooftop )?solar\b/i.test(value) && !uncertainOrNegative.test(value)) next.solar = value;
  for (const load of loadChoices) {
    const detail = detailForLoad[load];
    if (detail && next[detail] === undefined && clauses(value).some(c => loadAliases[load].test(c) && !uncertainOrNegative.test(c) && /\b(?:daily|every day|weekly|week|hours?|regularly|rarely|often|loads?|heat pump|storage|instantaneous)\b/i.test(c))) next[detail] = value;
  }
  return next;
}
export const MAX_QUESTION_SLOTS = 5;
export function nextQuestion(h: Household, bill: Bill, substantiveSlots = Object.keys(h).length): QuestionId | null {
  if (substantiveSlots >= MAX_QUESTION_SLOTS) return null;
  if (h.occupancy === undefined) return "occupancy";
  if (h.loads === undefined) return "loads";
  const candidates: QuestionId[] = [];
  const branches: [typeof loadChoices[number], QuestionId][] = [[loadChoices[1], "hotWater"], [loadChoices[0], "cooling"], [loadChoices[2], "dryer"], [loadChoices[3], "pool"], [loadChoices[4], "ev"], [loadChoices[5], "refrigeration"]];
  for (const [load, question] of branches) if (hasLoad(h, load)) candidates.push(question);
  if (bill.solarExportKwh.value === null && bill.feedInCreditAud.value === null) candidates.push("solar");
  candidates.push("routine");
  if (loadChoices.some(load => hasLoad(h, load))) candidates.push("priority");
  return candidates.find(q => h[q] === undefined) ?? null;
}
export const UNKNOWN_ANSWER = "Unknown";
const unknownReport = /\b(?:not sure|unsure|unknown|don[’']?t know|do not know|no idea|skip|maybe|perhaps)\b/i;
export function isUnknownAnswer(value: string | undefined): boolean { return !value || unknownReport.test(value); }
const numberWords: Record<string, number> = { zero: 0, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10 };
export function bareNumber(value: string): number | null {
  const v = value.toLowerCase().trim().replace(/[.!]$/, "");
  const n = numberWords[v] ?? (/^\d+(?:\.\d+)?$/.test(v) ? Number(v) : null);
  return n !== null && n <= 10000 ? n : null;
}
export function refrigerationCount(value: string): number | null {
  const bare = bareNumber(value); if (bare !== null && Number.isInteger(bare)) return bare;
  // Never silently turn “one fridge and one freezer” into one total unit.
  if (/\band\b/i.test(value) && !/\b(?:in total|total)\b/i.test(value)) return null;
  const match = value.match(/\b(\d+|one|two|three|four|five)\s*(?:fridges?(?:\/freezers?)?|freezers?|units?|appliances?|in total|total)\b/i);
  return match ? Number(numberWords[match[1]!.toLowerCase()] ?? match[1]!) : null;
}
export function explicitExtra(value: string): boolean { return /\b(?:extra|additional|secondary|second|spare)\b/i.test(value) && !/\b(?:no|not|without)\s+(?:an?\s+)?(?:extra|additional|secondary|second|spare)\b/i.test(value); }
export type Opportunity = { title: string; priority: "Start here" | "Worth reviewing" | "Needs clarification" | "Not enough evidence to prioritise"; reported: string; why: string; unknown: string; action: string; sourceId: "equipment" | "appliances"; heatLink?: boolean };
export function opportunities(h: Household): Opportunity[] {
  const results: (Opportunity & { order: number })[] = [];
  const report = (q: QuestionId, selection: string) => isUnknownAnswer(h[q]) ? selection : h[q]!;
  if (hasLoad(h, loadChoices[1])) results.push({ order: 0, title: "Electric hot water", priority: isUnknownAnswer(h.hotWater) ? "Needs clarification" : "Start here", reported: report("hotWater", "You selected electric hot water."), why: "Establishing whether hot water is individually electric helps decide whether to investigate it within this property's bill.", unknown: isUnknownAnswer(h.hotWater) ? "System type, heating schedule and whether supply is individual or central remain unknown." : "The bill does not measure hot-water electricity. Its heating schedule and metering may still need checking.", action: "Check the system label or building/strata information first, including whether it is individually metered. Review its schedule with a qualified professional; preserve safety settings before considering equipment changes.", sourceId: "appliances" });
  if (hasLoad(h, loadChoices[0])) results.push({ order: 1, title: "Cooling and electric heating", priority: isUnknownAnswer(h.cooling) ? "Needs clarification" : "Worth reviewing", reported: report("cooling", "You selected air conditioning / electric heating."), why: "You reported a space-conditioning load whose operating time and occupied rooms can be reviewed before changing equipment.", unknown: "Operating electricity and the home's heating/cooling demand are unmeasured; reported hours do not establish appliance kWh.", action: "Check timers and which rooms need conditioning. For summer cooling, investigate heat entering the home while preserving comfort before considering equipment changes.", sourceId: "equipment", heatLink: true });
  if (hasLoad(h, loadChoices[3])) results.push({ order: 2, title: "Pool or spa pump", priority: "Worth reviewing", reported: report("pool", "You selected a pool or spa pump."), why: "A reported pump is a useful place to check scheduled operation against actual filtration needs.", unknown: "Pump power, measured consumption and an appropriate filtration schedule are not established by the bill.", action: "Record its schedule and model. Ask a pool professional whether operation suits filtration and water-quality needs before changing it.", sourceId: "appliances" });
  if (hasLoad(h, loadChoices[4])) results.push({ order: 3, title: "EV charging", priority: "Worth reviewing", reported: report("ev", "You selected home EV charging."), why: "Home charging is a reported load that may have its own records, making it useful to investigate directly.", unknown: "Charging sessions do not establish charging kWh, and the bill does not isolate the charger.", action: "Check charger records over the same billing period. Keep measured charging separate from the remainder when comparing future usage.", sourceId: "appliances" });
  if (hasLoad(h, loadChoices[2])) {
    const zero = /\b(?:0|zero|no) (?:dryer )?cycles?\b|\bnever\b/i.test(h.dryer ?? "");
    results.push({ order: zero ? 8 : 4, title: "Clothes drying", priority: zero ? "Not enough evidence to prioritise" : isUnknownAnswer(h.dryer) ? "Needs clarification" : "Worth reviewing", reported: report("dryer", "You selected a clothes dryer."), why: zero ? "You did not report dryer cycles for this period, so it is not a useful first investigation." : "Drying is a discretionary electrical load you reported; its operating pattern can be reviewed without attributing bill consumption to it.", unknown: isUnknownAnswer(h.dryer) ? "Dryer frequency remains unknown; its electricity use is not measured." : "Equipment consumption and appliance-level kWh remain unknown.", action: zero ? "No special drying action is suggested for this period." : "Where practical, try line/air drying and review necessary cycles. Follow the manual for loads and filter care, then compare records over a future similar period before considering replacement.", sourceId: "appliances" });
  }
  if (hasLoad(h, loadChoices[5])) {
    const answer = h.refrigeration ?? "", count = refrigerationCount(answer), extra = explicitExtra(answer);
    const normal = count !== null && count <= 1 && !extra;
    results.push({ order: normal ? 9 : 5, title: normal ? "Refrigeration" : count !== null && count > 1 || extra ? "Extra refrigeration" : "Refrigeration to check", priority: normal ? "Not enough evidence to prioritise" : count !== null && count > 1 || extra ? "Worth reviewing" : "Needs clarification", reported: report("refrigeration", "You selected extra fridges / freezers; the total number is not established."), why: normal ? count === 0 ? "No running refrigeration units were reported for this period." : "One normal fridge/freezer does not by itself indicate unnecessary refrigeration demand." : "Clarifying which units are additional and needed can reveal unnecessary operation, without assuming their electricity use.", unknown: "Unit models, condition and measured electricity are unknown; an energy label is not a home measurement.", action: normal ? "No special action is suggested from the count alone. Check the model/label only if age, condition or efficiency is a concern." : "Confirm the total units and which are additional. Review whether additional units are needed, then check seals and model energy labels before considering replacement.", sourceId: "appliances" });
  }
  if (hasLoad(h, loadChoices[6])) results.push({ order: 7, title: "Dishwashing", priority: "Worth reviewing", reported: "You selected a dishwasher.", why: "Load size and programme choices are practical operating checks for an appliance you reported.", unknown: "Cycle frequency and measured electricity are unknown.", action: "Review full loads and the manual's efficient programmes before considering equipment changes.", sourceId: "appliances" });
  // This orders qualitative investigation usefulness, never measured consumption or savings.
  return results.sort((a, b) => a.order - b.order).slice(0, 3);
}
