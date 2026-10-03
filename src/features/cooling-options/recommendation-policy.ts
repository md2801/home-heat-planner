/** Unknown or unselected equipment must never become an equipment recommendation. */
export function hasReportedAC(equipment: readonly string[] | null | undefined): boolean {
  return equipment?.includes("air-conditioner") === true;
}

export function equipmentCopyAllowed(text: string, equipment: readonly string[] | null | undefined): boolean {
  const normalised = text.normalize("NFKC").replace(/[‐‑–—]/g, "-");
  if (!hasReportedAC(equipment) && /\b(?:ac|a\s*\/\s*c|air[ -]?con(?:dition(?:er|ing|ers))?|airconditioning|reverse[ -]cycle|split[ -]system|compressor|refrigerated cooling|heat pump)\b/i.test(normalised)) return false;
  if (!equipment?.includes("fan") && /\b(?:fans?|ceiling[ -]fans?|pedestal[ -]fans?)\b/i.test(normalised)) return false;
  return true;
}
