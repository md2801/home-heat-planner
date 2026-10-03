import type { Comparison, Fact, FinancialResult, Provenance, RoomProfile } from "../../domain/models.ts";
import { unknown } from "../../domain/unknown.ts";
import { calculateSimplePayback } from "../../lib/calculations/financial.ts";

export const LABEL_METHOD = "zerl-comparable-ac-v1";
export const LABEL_SOURCE = "https://www.energyrating.gov.au/consumer-information/understand-zoned-energy-rating-label";
export const replacementFields = [
  ["existingModel", "Existing indoor + outdoor model identifiers", "text"],
  ["proposedModel", "Replacement indoor + outdoor model identifiers", "text"],
  ["existingSource", "Existing model's Zoned Energy Rating Label URL", "url"],
  ["proposedSource", "Replacement model's Zoned Energy Rating Label URL", "url"],
  ["checkedDate", "Date the two labels were checked", "date"],
  ["existingCapacity", "Existing rated cooling capacity (kW output)", "number"],
  ["proposedCapacity", "Replacement rated cooling capacity (kW output)", "number"],
  ["existingKwh", "Existing annual cooling energy - Average zone (kWh/year)", "number"],
  ["proposedKwh", "Replacement annual cooling energy - Average zone (kWh/year)", "number"],
  ["tariff", "Flat electricity usage rate (AUD/kWh)", "number"],
  ["installedCost", "Installed replacement quote (AUD)", "number"],
  ["quoteScope", "Quote provider and inclusions (installation, removal, electrical work)", "text"],
  ["quoteDate", "Quote date", "date"],
  ["existingRecurring", "Existing additional annual recurring costs (AUD; enter 0 if none)", "number"],
  ["proposedRecurring", "Replacement additional annual recurring costs (AUD; enter 0 if none)", "number"],
  ["serviceLife", "Supported expected service life (years; optional)", "number"],
  ["serviceLifeSource", "Service-life source or warranty document (optional)", "text"],
] as const;
export type ReplacementField = typeof replacementFields[number][0];
export const replacementChecks = [
  ["climate", "I checked my postcode in the Energy Rating Calculator: Average zone applies."],
  ["labels", "Both figures are cooling kWh/year from current Zoned Energy Rating Labels, not heating energy, electrical kW or cooling capacity."],
  ["sizing", "A qualified installer confirmed both non-ducted single-split systems have comparable features, the same rated capacity, and suitable sizing for this bedroom."],
  ["conditions", "Use the label's standard annual conditions (Average zone: 840 cooling hours). Actual use, comfort and bills may differ; this is not my measured annual bill."],
] as const;
export type ReplacementCheck = typeof replacementChecks[number][0];
export type ReplacementStep = 0 | 1 | 2 | 3;
export interface ReplacementInputs { fields: Partial<Record<ReplacementField, string>>; confirmations: Partial<Record<ReplacementCheck, boolean>>; updatedAt: string; step?: ReplacementStep }
export function emptyReplacement(now: string): ReplacementInputs { return { fields: {}, confirmations: {}, updatedAt: now }; }
export function isReplacementInputs(value: unknown): value is ReplacementInputs {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const v = value as ReplacementInputs;
  return typeof v.updatedAt === "string" && Number.isFinite(Date.parse(v.updatedAt)) && (v.step === undefined || (Number.isInteger(v.step) && v.step >= 0 && v.step <= 3)) && !!v.fields && typeof v.fields === "object" && !Array.isArray(v.fields) && !!v.confirmations && typeof v.confirmations === "object" && !Array.isArray(v.confirmations)
    && Object.entries(v.fields).every(([key, val]) => replacementFields.some(f => f[0] === key) && typeof val === "string" && val.length <= 500)
    && Object.entries(v.confirmations).every(([key, val]) => replacementChecks.some(c => c[0] === key) && typeof val === "boolean");
}
const https = (s: string) => { try { const u = new URL(s); return u.protocol === "https:" && !u.username && !u.password; } catch { return false; } };
const date = (s: string) => /^\d{4}-\d{2}-\d{2}$/.test(s) && Number.isFinite(Date.parse(s)) && new Date(s).toISOString().slice(0, 10) === s;
export function replacementComparison(input: ReplacementInputs | undefined, profile: RoomProfile) {
  const fields = input?.fields ?? {};
  const gaps: string[] = [];
  const value = (key: ReplacementField) => fields[key]?.trim() ?? "";
  const number = (key: ReplacementField) => { const text = value(key); const n = Number(text); return text && /^\d+(\.\d+)?$/.test(text) && Number.isFinite(n) && n >= 0 ? n : null; };
  for (const [key, label, kind] of replacementFields) {
    if (key === "serviceLife" || key === "serviceLifeSource") continue;
    if (!value(key) || (kind === "number" && number(key) === null) || (kind === "url" && !https(value(key))) || (kind === "date" && (!date(value(key)) || value(key) > (input?.updatedAt.slice(0, 10) ?? "")))) gaps.push(label);
  }
  for (const [key, label] of replacementChecks) if (!input?.confirmations[key]) gaps.push(label);
  if (profile.cooling.status !== "known" || !profile.cooling.value.equipment.includes("air-conditioner") || profile.cooling.value.servesOnlyRoom.status !== "known" || !profile.cooling.value.servesOnlyRoom.value) gaps.push("Confirm the existing AC serves only this bedroom.");
  if (profile.externalChangesPermitted.status !== "known" || !profile.externalChangesPermitted.value) gaps.push("Confirm permission for the replacement and external unit.");
  const capacity = number("existingCapacity");
  if (capacity === null || capacity <= 0 || capacity > 30 || number("proposedCapacity") !== capacity) gaps.push("This narrow method requires equal positive rated cooling capacities up to 30 kW.");
  if (value("existingModel") && value("existingModel") === value("proposedModel")) gaps.push("Supply two distinct models.");
  const sources = [LABEL_SOURCE, value("existingSource"), value("proposedSource")].filter(https);
  const provenance: Provenance = { kind: "user-reported", recordedAt: input?.updatedAt ?? "", sourceIds: sources, scope: "User-transcribed model labels and scoped quote; not independently verified" };
  const known = <T>(v: T): Fact<T> => ({ status: "known", value: v, provenance });
  const assumptions = input?.confirmations.conditions ? [{ id: "zerl-conditions", description: "Same-capacity non-ducted single-split ACs; Average zone standard annual cooling conditions, including 840 cooling hours. No scaling to household usage or to a measured bedroom baseline.", provenance }] : [];
  const limitations = ["Standard label comparison, not personalised or measured annual savings. User-transcribed source values have not been independently verified.", "Cooling only; heating, fixed supply charges, time-of-use and financing excluded. Recurring costs are additional to electricity and must not be double-counted.", "Installer must confirm comparable service, comfort, sizing and installation constraints. Weather and operation affect actual bills."];
  const financial = (n: number | null): FinancialResult => ({ status: gaps.length ? "insufficient-evidence" : "supported-estimate", amountAud: gaps.length || n === null ? unknown(gaps.join("; ") || "Input missing") : known(n), currency: "AUD", period: input?.confirmations.conditions ? known({ kind: "standardised-year", basis: "annual", description: "Zoned Energy Rating Label - Average climate, standard annual cooling conditions" }) : unknown("Standard annual label conditions not accepted"), methodVersion: LABEL_METHOD, inputProvenance: input ? [provenance] : [], assumptions, sourceIds: sources, limitations: [...gaps, ...limitations] });
  const current = number("existingKwh"), proposed = number("proposedKwh"), tariff = number("tariff"), beforeRecurring = number("existingRecurring"), afterRecurring = number("proposedRecurring");
  const before = current !== null && tariff !== null ? current * tariff : null;
  const after = proposed !== null && tariff !== null ? proposed * tariff : null;
  const net = before !== null && after !== null && beforeRecurring !== null && afterRecurring !== null ? before - after + beforeRecurring - afterRecurring : null;
  if ([before, after, net].some(n => n !== null && !Number.isFinite(n))) gaps.push("Values exceed the supported numeric range.");
  const cost = number("installedCost");
  const upfront = cost !== null && value("quoteScope") && date(value("quoteDate")) && value("quoteDate") <= (input?.updatedAt.slice(0, 10) ?? "") ? known(cost) : unknown("A dated, scoped installed quote is required");
  const netResult = financial(net);
  const payback = calculateSimplePayback(upfront, netResult);
  const years = payback.status === "calculated" ? known(payback.years) : unknown(payback.reason);
  const life = number("serviceLife");
  const lifeWarning = life !== null && life > 0 && value("serviceLifeSource") && payback.status === "calculated" && payback.years > life ? "Simple payback exceeds the supplied supported service life." : !value("serviceLifeSource") ? "Expected service life is not established; compare it with payback before spending." : "";
  const comparison: Comparison = { optionId: "ac-replacement", baseline: financial(before), proposed: financial(after), annualNetSavings: netResult, simplePaybackYears: years, assumptions };
  return { comparison, upfront, gaps, lifeWarning, costScope: value("quoteScope"), sources, inputRows: replacementFields.filter(([key]) => value(key)).map(([key, label]) => `${label}: ${value(key)}`) };
}
