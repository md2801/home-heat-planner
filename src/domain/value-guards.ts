type RecordValue = Record<string, unknown>;
export const record = (v: unknown): v is RecordValue => !!v && typeof v === "object" && !Array.isArray(v);
const strings = (v: unknown): v is string[] => Array.isArray(v) && v.every(s => typeof s === "string");
export const numeric = (v: unknown): boolean => typeof v === "number" && Number.isFinite(v) || record(v) && typeof v.min === "number" && typeof v.max === "number" && Number.isFinite(v.min) && Number.isFinite(v.max) && v.min <= v.max;
export const provenance = (v: unknown): boolean => record(v) && ["measured", "sourced", "user-reported", "assumed"].includes(String(v.kind)) && typeof v.recordedAt === "string" && Number.isFinite(Date.parse(v.recordedAt)) && strings(v.sourceIds) && typeof v.scope === "string";
export function fact(v: unknown, value: (v: unknown) => boolean): boolean { return record(v) && (v.status === "unknown" && typeof v.reason === "string" || v.status === "known" && value(v.value) && provenance(v.provenance)); }
export const stringFact = (v: unknown) => fact(v, x => typeof x === "string");
const boolFact = (v: unknown) => fact(v, x => typeof x === "boolean");
function assumptions(v: unknown): boolean { return Array.isArray(v) && v.every(a => record(a) && typeof a.id === "string" && typeof a.description === "string" && provenance(a.provenance)); }
export function financial(v: unknown): boolean {
  return record(v) && ["supported-estimate", "what-if", "insufficient-evidence"].includes(String(v.status)) && v.currency === "AUD" && fact(v.amountAud, numeric) && fact(v.period, p => record(p) && (p.kind === "standardised-year" && p.basis === "annual" && typeof p.description === "string" || p.kind === "date-range" && typeof p.start === "string" && typeof p.end === "string" || p.kind === "cooling-schedule" && typeof p.coolingDays === "number" && ["annual", "stated-period"].includes(String(p.basis)) && typeof p.description === "string")) && typeof v.methodVersion === "string" && Array.isArray(v.inputProvenance) && v.inputProvenance.every(provenance) && assumptions(v.assumptions) && strings(v.sourceIds) && strings(v.limitations);
}
export function recommendation(v: unknown): boolean {
  return record(v) && ["id", "actionId", "description", "catalogueVersion"].every(key => typeof v[key] === "string") && ["eligible", "ineligible", "needs-information"].includes(String(v.eligibility)) && ["requiredChecks", "factIds", "sourceIds", "comfortTradeOffs"].every(key => strings(v[key])) && fact(v.upfrontCostAud, numeric) && stringFact(v.costScope);
}
export function comparison(v: unknown): boolean { return record(v) && typeof v.optionId === "string" && financial(v.baseline) && financial(v.proposed) && financial(v.annualNetSavings) && (v.periodSavings === undefined || financial(v.periodSavings)) && (v.energySavingsKwh === undefined || fact(v.energySavingsKwh, n => typeof n === "number" && Number.isFinite(n))) && fact(v.simplePaybackYears, n => numeric(n) && (typeof n !== "number" || n > 0)) && assumptions(v.assumptions); }
export function profile(v: unknown): boolean {
  if (!record(v) || typeof v.id !== "string") return false;
  const p = v;
  const enumFact = (key: string, allowed: string[]) => fact(p[key], x => typeof x === "string" && allowed.includes(x));
  const listFact = (key: string, allowed?: string[]) => fact(p[key], x => strings(x) && (!allowed || x.every(s => allowed.includes(s))));
  const directions = ["north", "north-east", "east", "south-east", "south", "south-west", "west", "north-west"];
  const windowSummary = p.windowSummary;
  return ["location", "complaint", "goal", "confirmedAt"].every(key => stringFact(p[key])) && enumFact("roomType", ["bedroom"]) && enumFact("position", ["ground-floor", "upper-floor"]) && enumFact("aboveRoom", ["roof", "another-dwelling", "another-room"]) && listFact("heatTiming", ["morning", "afternoon", "evening", "overnight"]) && listFact("ventilationConstraints") && ["insulation", "externalChangesPermitted", "willingToObtainQuotes"].every(key => boolFact(p[key])) && fact(p.budgetAud, numeric) && fact(p.cooling, x => record(x) && strings(x.equipment) && x.equipment.every(e => ["fan", "air-conditioner"].includes(e)) && stringFact(x.modelIdentifier) && boolFact(x.servesOnlyRoom)) && fact(p.windows, x => Array.isArray(x) && x.every(w => record(w) && typeof w.id === "string" && fact(w.orientation, d => typeof d === "string" && directions.includes(d)) && boolFact(w.externalShading) && stringFact(w.internalCoverings) && boolFact(w.opens))) && (windowSummary === undefined || record(windowSummary) && fact(windowSummary.orientations, x => strings(x) && x.every(d => directions.includes(d))) && fact(windowSummary.externalShading, x => ["all", "some", "none"].includes(String(x))) && fact(windowSummary.internalCoverings, strings) && fact(windowSummary.opens, x => ["all", "some", "none"].includes(String(x))));
}
