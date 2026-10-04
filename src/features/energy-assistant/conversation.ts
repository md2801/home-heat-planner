import { bareNumber, explicitExtra, refrigerationCount, UNKNOWN_ANSWER, detailForLoad, billingDays, hasLoad, loadChoices, nextQuestion, questionTitles, recordAnswer, type Household, type QuestionId } from './logic.ts';
import type { Bill } from '../../contracts/energy-assistant.ts';
export { MAX_QUESTION_SLOTS } from "./logic.ts";
export type AnswerKind = 'usable' | 'ambiguous' | 'non-responsive' | 'unknown';
export type AnswerCheck = { kind: AnswerKind; value?: string; prompt?: string; proposal?: string };
export type BillConversation = { asked: QuestionId[]; current: QuestionId | null; clarification: { prompt: string; proposal?: string } | null };
export function questionText(q: QuestionId, bill: Bill): string {
  const days = billingDays(bill).value;
  if (q === 'dryer') return `About how many dryer cycles did you run during ${days === null ? 'the confirmed billing period' : `this ${days}-day billing period`}?`;
  return questionTitles[q];
}
const unknown = /\b(?:not sure|unsure|unknown|don[’']?t know|do not know|no idea|skip|can[’']?t say|cannot say|maybe|perhaps)\b/i;
/** Conservative recognition, not a language model: unclear reports get one clarification, never inferred measurements. */
export function checkAnswer(q: QuestionId, value: string, bill: Bill, unitsEstablished = true): AnswerCheck {
  const v = value.trim().slice(0, 1000);
  if (unknown.test(v)) return { kind: 'unknown' };
  const usable = (answer = v): AnswerCheck => ({ kind: 'usable', value: answer });
  const unclear = (prompt: string, kind: AnswerKind = 'non-responsive', proposal?: string): AnswerCheck => ({ kind, prompt, ...(proposal ? { proposal } : {}) });
  const n = bareNumber(v);
  if (q === 'occupancy') {
    if (n !== null && Number.isInteger(n) && n >= 1 && n <= 100) return usable(`${n} ${n === 1 ? "person normally lives" : "people normally live"} in the home.`);
    if (/\b(?:\d+|one|two|three|four|five|six)\s*(?:people|persons?|occupants?|adults?|children|or more)\b/i.test(v) || /\b(?:just me|live alone|only me)\b/i.test(v)) return usable();
    return unclear('About how many people normally live in the home? A number of people is enough, or choose Not sure.');
  }
  if (q === 'loads') {
    if (/^(?:none(?: of these)?|no major loads)[.!]?$/i.test(v) || loadChoices.some(load => hasLoad({ loads: v }, load))) return usable();
    return unclear('Which of the listed major electrical loads do you use? Select any that apply, choose None of these, or skip.');
  }
  if (q === 'dryer') {
    const period = billingDays(bill).value;
    const numericReport = n === null ? undefined : `Approximately ${n} dryer cycles during ${period === null ? 'the confirmed billing period' : `the ${period}-day billing period`}.`;
    if (n !== null) return unitsEstablished ? usable(numericReport) : unclear(`Just to confirm — do you mean about ${n} dryer cycles during ${period === null ? 'the billing period' : `this ${period}-day billing period`}?`, 'ambiguous', numericReport);
    if (/\b(?:no|zero|0)\s*(?:dryer )?(?:cycles?|use|loads?)\b|\b(?:never|didn[’']?t use|do not have|don[’']?t have|no dryer)\b/i.test(v)) return usable();
    const cycles = v.match(/^(?:about |approximately |around )?(\d+(?:\.\d+)?)\s*(?:dryer )?(?:cycles?|loads?|times?)[.!]?$/i);
    if (cycles && unitsEstablished && Number(cycles[1]) <= 10000) return usable(`Approximately ${cycles[1]} dryer cycles during ${period === null ? 'the confirmed billing period' : `the ${period}-day billing period`}.`);
    if (/\b(?:hours?|hrs?)\b/i.test(v) && !/\bcycles?\b/i.test(v)) return unclear(questionText(q, bill) + ' Please give cycles rather than hours, or choose Not sure.', 'ambiguous');
    if (/\b(?:daily|every day|most days|weekly|monthly|rarely|occasionally|often)\b/i.test(v) || /\b(?:cycles?|loads?|times?)\b.*\b(?:week|day|month|period|days)\b/i.test(v)) return usable();
    return unclear(questionText(q, bill) + ' Please give cycles rather than hours, or choose Not sure.', 'ambiguous');
  }
  if (q === 'hotWater') {
    if (/\b(?:heat[- ]pump|electric storage|storage tank|instantaneous|continuous[- ]flow|centrally supplied|central(?:ised)?|communal|shared|own electric|individual electric|no electric hot water|gas hot water)\b/i.test(v)) return usable();
    return unclear('Do you know whether your home has its own electric hot-water system (such as a storage tank or heat pump), or whether hot water is supplied centrally by the building? It’s fine not to know.');
  }
  if (q === 'refrigeration') {
    if (explicitExtra(v) && /\b(?:fridge|freezer)\b/i.test(v) && !/\b(?:total|in total)\b/i.test(v)) return usable("An additional fridge/freezer is reported; total units are not established.");
    const count = refrigerationCount(v);
    if (count !== null) return usable(`${count} ${count === 1 ? "fridge/freezer" : "fridges/freezers"} in total.${explicitExtra(v) ? ' Includes an additional unit.' : ''}`);
    if (explicitExtra(v) && /\b(?:fridge|freezer)\b/i.test(v)) return usable();
    if (/\b(?:no|none|zero)\b/i.test(v)) return usable('0 fridges/freezers in total.');
    return unclear('How many fridges and freezers run in your home in total, including the main kitchen unit? If you mean an additional unit, please say so.');
  }
  if (q === 'solar') {
    if (/^(?:yes|no)[.!]?$/i.test(v) || /\b(?:have|no|without|don[’']?t have)\b.*\bsolar\b/i.test(v)) return usable();
    return unclear('Do you have rooftop solar: yes, no, or not sure?');
  }
  if (['cooling', 'pool', 'ev'].includes(q)) {
    const unit = q === 'ev' ? 'home charging sessions per week' : 'hours per day';
    const max = q === 'ev' ? 100 : 24;
    if (n !== null && unitsEstablished && n <= max) return usable(`Approximately ${n} ${unit}.`);
    if (/\b(?:no|never|don[’']?t have|do not have|didn[’']?t use)\b/i.test(v)) return usable();
    if (/\b(?:hours?|hrs?|daily|weekly|every day|most days|rarely|occasionally|overnight|sessions?|times? per week)\b/i.test(v)) return usable();
    return unclear(questionText(q, bill) + ' Please include the units, or choose Not sure.', 'ambiguous');
  }
  if (q === 'routine') {
    if (/\b(?:typical|normal|usual|same|visitors?|away|holiday|home|changed|changes|working|work|unusual)\b/i.test(v)) return usable();
    return unclear('Was this a typical period, or did occupancy or time at home change? You can also skip.');
  }
  if (loadChoices.some(load => hasLoad({ loads: v }, load)) || /\b(?:usage|habit|cooling|heating|hot water|drying|refrigeration)\b/i.test(v)) return usable();
  return unclear('Which of your reported loads or energy-use habits would you like to understand first? You can also skip.');
}
export function startConversation(h: Household, bill: Bill, asked: QuestionId[] = []): BillConversation {
  const current = nextQuestion(h, bill, asked.length);
  return { asked: current ? [...asked, current] : [...asked], current, clarification: null };
}
export function answerConversation(state: BillConversation, household: Household, bill: Bill, value: string, unitsEstablished = true): { state: BillConversation; household: Household; reply: string } {
  if (!state.current) return { state, household, reply: '' };
  const q = state.current;
  const result = state.clarification?.proposal && /^yes[.!]?$/i.test(value.trim()) ? { kind: 'usable' as const, value: state.clarification.proposal } : checkAnswer(q, value, bill, unitsEstablished);
  if ((result.kind === 'ambiguous' || result.kind === 'non-responsive') && !state.clarification) {
    const clarification = { prompt: result.prompt!, ...(result.proposal ? { proposal: result.proposal } : {}) };
    return { state: { ...state, clarification }, household, reply: clarification.prompt };
  }
  const answer = result.kind === 'usable' ? result.value! : UNKNOWN_ANSWER;
  const updated: Household = { ...household, [q]: answer };
  // Bundled reports can avoid repeat questions, but every inferred detail needs its own validation.
  if (result.kind === 'usable') {
    const candidates = recordAnswer(household, q, answer);
    for (const key of Object.keys(candidates) as QuestionId[]) {
      if (key === q || updated[key] !== undefined) continue;
      const report = candidates[key]!;
      if (key === 'loads') {
        const selected = loadChoices.filter(load => hasLoad({ loads: report }, load));
        if (selected.length) updated.loads = selected.join('; ');
      } else {
        const clause = report.split(/[.;]|\bbut\b|\band\b/i).find(part => key === 'solar' ? /\bsolar\b/i.test(part) : loadChoices.some(load => detailForLoad[load] === key && hasLoad({ loads: part }, load)));
        if (clause) { const check = checkAnswer(key, clause, bill, false); if (check.kind === 'usable') updated[key] = check.value!; }
      }
    }
  }
  const next = startConversation(updated, bill, state.asked);
  return { state: next, household: updated, reply: next.current ? questionText(next.current, bill) : 'Thanks — here’s where to start investigating, using your confirmed bill and the usable information you shared. Anything still unclear stays unknown.' };
}
