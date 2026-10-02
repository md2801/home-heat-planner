import type { Comparison, Fact, NumericRange } from "../../domain/models.ts";
export function financialText(value: Fact<number | NumericRange>, kind: "money" | "years" = "money"): string {
  if (value.status === "unknown") return "Unavailable";
  const format = (n: number) => kind === "years" ? `${Math.round(n * 10) / 10}` : new Intl.NumberFormat("en-AU", { style: "currency", currency: "AUD", maximumFractionDigits: 2 }).format(n);
  return typeof value.value === "number" ? `${format(value.value)}${kind === "years" ? " years" : ""}` : `${format(value.value.min)}–${format(value.value.max)}${kind === "years" ? " years" : ""}`;
}
export function financialSummary(comparison: Comparison, upfront: Fact<number | NumericRange>) {
  const savings = comparison.annualNetSavings.amountAud;
  const amount = savings.status === "known" && typeof savings.value === "number" ? savings.value : null;
  const display = savings.status === "known" && amount !== null && amount < 0 ? financialText({ ...savings, value: -amount }) : financialText(savings);
  return { cost: upfront.status === "unknown" ? "Quote needed" : financialText(upfront), savings: savings.status === "known" ? `${display}/yr${amount !== null && amount < 0 ? " higher cost" : ""}` : "Unavailable", payback: financialText(comparison.simplePaybackYears, "years"), reason: comparison.simplePaybackYears.status === "unknown" ? comparison.simplePaybackYears.reason : "Simple, undiscounted; under displayed annual assumptions" };
}
