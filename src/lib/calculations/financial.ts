import type { BaselineInputs, Fact, FinancialResult, Period, Provenance } from "../../domain/models.ts";
import { unknown } from "../../domain/unknown.ts";

export const FINANCIAL_METHOD_VERSION = "flat-cooling-cost-v1";
const validNumber = (value: number) => Number.isFinite(value) && value >= 0;

function numberFrom(fact: Fact<number>): number | null {
  return fact.status === "known" && validNumber(fact.value) ? fact.value : null;
}

function validPeriod(period: Period): boolean {
  if (period.kind === "standardised-year") return period.basis === "annual" && !!period.description.trim();
  if (period.kind === "cooling-schedule") return validNumber(period.coolingDays) && period.description.trim().length > 0;
  const start = Date.parse(period.start);
  const end = Date.parse(period.end);
  return Number.isFinite(start) && Number.isFinite(end) && end >= start;
}

/** Flat usage charges only. No supply charges, annualisation or intervention effect. */
export function calculateCoolingCost(inputs: BaselineInputs, scope: "bedroom" | "supplied-scenario" = "bedroom"): FinancialResult {
  const provenance: Provenance[] = [];
  const missing: string[] = [];
  const read = (fact: Fact<number>, label: string): number | null => {
    const value = numberFrom(fact);
    if (value === null) missing.push(label);
    else if (fact.status === "known") provenance.push(fact.provenance);
    return value;
  };
  const tariff = read(inputs.flatTariffAudPerKwh, "A valid flat usage tariff is required.");
  if (inputs.period.status === "unknown" || !validPeriod(inputs.period.value)) missing.push("A valid comparison period is required.");
  if (scope === "supplied-scenario" && inputs.energy.kind !== "electrical-input-scenario") missing.push("Measured consumption requires bedroom attribution; scenario scope cannot be used.");
  if (scope === "bedroom" && (inputs.bedroomAttribution.status === "unknown" || !inputs.bedroomAttribution.value.description.trim())) {
    missing.push("Bedroom-specific consumption or explicit attribution is required.");
  } else if (scope === "bedroom" && inputs.bedroomAttribution.status === "known") {
    provenance.push(inputs.bedroomAttribution.provenance);
    if (inputs.bedroomAttribution.provenance.kind === "sourced" && !inputs.bedroomAttribution.value.sourceIds.length) {
      missing.push("Sourced bedroom attribution requires evidence references.");
    }
  }
  if (inputs.period.status === "known") provenance.push(inputs.period.provenance);

  let energy: number | null;
  if (inputs.energy.kind === "measured") {
    energy = read(inputs.energy.coolingKwh, "Cooling-specific kWh is required.");
  } else {
    const power = read(inputs.energy.averageElectricalInputKw, "Average electrical input kW is required; cooling capacity cannot be used.");
    const hours = read(inputs.energy.hoursPerDay, "Operating hours per day are required.");
    const days = read(inputs.energy.coolingDays, "Cooling days are required.");
    if (hours !== null && hours > 24) missing.push("Hours per day cannot exceed 24.");
    if (inputs.energy.averageElectricalInputKw.status === "known") {
      const powerSource = inputs.energy.averageElectricalInputKw.provenance;
      if (powerSource.kind !== "assumed" && powerSource.kind !== "sourced") missing.push("Average input power must be explicitly assumed or sourced.");
    }
    if (inputs.period.status === "known" && inputs.period.value.kind === "cooling-schedule" && days !== null && days !== inputs.period.value.coolingDays) {
      missing.push("Cooling days must match the comparison schedule.");
    }
    energy = power === null || hours === null || days === null ? null : power * hours * days;
  }
  for (const input of provenance) {
    if (!input.scope.trim() || !Number.isFinite(Date.parse(input.recordedAt))) missing.push("Input provenance requires a scope and valid recorded date.");
    if (input.kind === "sourced" && !input.sourceIds.length) missing.push("Sourced inputs require evidence references.");
  }
  const amount = energy === null || tariff === null ? null : energy * tariff;
  if (amount !== null && !Number.isFinite(amount)) missing.push("Inputs exceed the supported numeric range.");
  const status = missing.length ? "insufficient-evidence" : inputs.energy.kind === "electrical-input-scenario" || provenance.some((p) => p.kind === "assumed") ? "what-if" : "supported-estimate";
  return {
    status,
    amountAud: status === "insufficient-evidence" || amount === null ? unknown(missing.join(" ")) : {
      status: "known", value: amount, provenance: {
        kind: status === "what-if" ? "assumed" : provenance.some(p => p.sourceIds.length > 0) ? "sourced" : "user-reported",
        recordedAt: provenance.map((p) => p.recordedAt).sort().at(-1) ?? "",
        sourceIds: [...new Set(provenance.flatMap((p) => p.sourceIds))],
        scope: scope === "bedroom" ? "Calculated bedroom cooling electricity usage cost" : "Calculated cost of the user-supplied cooling scenario",
      },
    },
    currency: "AUD", period: inputs.period, methodVersion: FINANCIAL_METHOD_VERSION,
    inputProvenance: provenance,
    assumptions: provenance.filter((p) => p.kind === "assumed").map((p, i) => ({ id: `input-assumption-${i}`, description: p.scope, provenance: p })),
    sourceIds: [...new Set(provenance.flatMap((p) => p.sourceIds))],
    limitations: [...new Set(missing), ...(scope === "supplied-scenario" ? ["Cost of the supplied equipment scenario; bedroom-specific consumption has not been established."] : []), "Excludes fixed supply charges, time-of-use tariffs and solar opportunity costs.", "Does not estimate any improvement's effect or annualise a shorter period."],
  };
}

export type PaybackResult =
  | { status: "calculated"; years: number; methodVersion: string; limitations: string[] }
  | { status: "unavailable"; reason: string; methodVersion: string };

/** Requires supplied, supported annual net savings; never infers an energy reduction. */
export function calculateSimplePayback(upfrontCostAud: Fact<number>, annualNetSavings: FinancialResult): PaybackResult {
  const unavailable = (reason: string): PaybackResult => ({ status: "unavailable", reason, methodVersion: "simple-payback-v1" });
  const upfront = numberFrom(upfrontCostAud);
  if (upfront === null) return unavailable("Upfront installed cost is unknown or invalid.");
  if (upfront === 0) return unavailable("There is no upfront cost to recover.");
  if (annualNetSavings.status !== "supported-estimate" || annualNetSavings.period.status !== "known" || annualNetSavings.period.value.kind === "date-range" || annualNetSavings.period.value.basis !== "annual" || !validPeriod(annualNetSavings.period.value)) {
    return unavailable("Supported annual net savings are required; a shorter period is not annualised.");
  }
  const amount = annualNetSavings.amountAud;
  if (amount.status === "unknown" || typeof amount.value !== "number" || !Number.isFinite(amount.value)) return unavailable("Annual net savings are unknown or not a single valid amount.");
  if (amount.value <= 0) return unavailable("There is no positive financial payback under these inputs.");
  const years = upfront / amount.value;
  if (!Number.isFinite(years)) return unavailable("Inputs exceed the supported numeric range.");
  return { status: "calculated", years, methodVersion: "simple-payback-v1", limitations: ["Simple, undiscounted estimate; excludes financing and future price changes.", "Expected service life has not been checked."] };
}
