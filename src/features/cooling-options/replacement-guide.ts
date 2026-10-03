import { replacementFields, type ReplacementField, type ReplacementInputs, type ReplacementStep } from "./replacement.ts";

export const comparisonSteps = ["Your current AC", "The replacement", "Rate & quote", "Your comparison"] as const;
export const stepFields: readonly (readonly ReplacementField[])[] = [
  ["existingModel", "existingCapacity", "existingKwh", "existingSource"],
  ["proposedModel", "proposedCapacity", "proposedKwh", "proposedSource"],
  ["tariff", "installedCost", "quoteScope", "quoteDate", "existingRecurring", "proposedRecurring"],
];
/** Resume old saved comparisons without migrating or filling any missing inputs. */
export function resumeReplacementStep(input: ReplacementInputs | undefined): ReplacementStep {
  if (input?.step !== undefined) return input.step;
  const incomplete = stepFields.findIndex(fields => fields.some(field => !input?.fields[field]?.trim()));
  return incomplete === -1 ? 3 : incomplete as ReplacementStep;
}
export const fieldCopy: Record<ReplacementField, { label: string; hint: string; unit?: string }> = {
  existingModel: { label: "Current AC model", hint: "Include the indoor and outdoor model numbers from the label or manual." },
  proposedModel: { label: "Replacement AC model", hint: "Include the indoor and outdoor model numbers from the product label." },
  existingCapacity: { label: "Current cooling capacity", hint: "Copy the cooling output at the top of the energy label. This is different from electricity use.", unit: "kW output" },
  proposedCapacity: { label: "Replacement cooling capacity", hint: "Use the same rated capacity as your current AC for this comparison.", unit: "kW output" },
  existingKwh: { label: "Current yearly cooling energy", hint: "Copy cooling kWh/year in the Average climate zone. Use the blue cooling figure, not heating.", unit: "kWh/year" },
  proposedKwh: { label: "Replacement yearly cooling energy", hint: "Copy cooling kWh/year in the Average climate zone from the replacement label.", unit: "kWh/year" },
  existingSource: { label: "Current energy-label link", hint: "Save a link to the model’s Zoned Energy Rating Label so the figures can be traced." },
  proposedSource: { label: "Replacement energy-label link", hint: "Save a link to the replacement model’s Zoned Energy Rating Label." },
  checkedDate: { label: "When did you check both labels?", hint: "Use the date you checked the current model-specific labels." },
  tariff: { label: "Your electricity usage rate", hint: "Find the flat usage rate on your bill, in dollars per kWh. Leave out the daily supply charge.", unit: "AUD/kWh" },
  installedCost: { label: "Total installed price", hint: "Use the quote total, including installation, removal and electrical work.", unit: "AUD" },
  quoteScope: { label: "Who quoted, and what’s included?", hint: "Name the provider and note installation, removal and any electrical work included." },
  quoteDate: { label: "Date of the quote", hint: "Use the date printed on the quote." },
  existingRecurring: { label: "Current AC’s extra yearly costs", hint: "Include maintenance or other recurring costs beyond electricity. Enter 0 only if there are none.", unit: "AUD/year" },
  proposedRecurring: { label: "Replacement’s extra yearly costs", hint: "Include recurring costs beyond electricity. Enter 0 only if there are none.", unit: "AUD/year" },
  serviceLife: { label: "Expected service life (optional)", hint: "Add this only if a source supports it, so you can compare it with payback.", unit: "years" },
  serviceLifeSource: { label: "Service-life source (optional)", hint: "Name the warranty or other document supporting the expected life." },
};
export const fieldType = (field: ReplacementField) => replacementFields.find(([key]) => key === field)![2];
