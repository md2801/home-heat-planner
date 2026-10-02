import type { AnswerValue, AssessmentAnswers, BaselineInputs, Direction, Fact, FinancialResult, HeatTiming, JourneyState, RoomProfile } from "../../domain/models.ts";
import { unknown } from "../../domain/unknown.ts";
import { calculateCoolingCost } from "../../lib/calculations/financial.ts";
import { assessmentJourney, type AssessmentDraft } from "../assessment/state.ts";

const isString = (value: AnswerValue): value is string => typeof value === "string";
const isNumber = (value: AnswerValue): value is number => typeof value === "number" && Number.isFinite(value) && value >= 0;
const isBoolean = (value: AnswerValue): value is boolean => typeof value === "boolean";
const isStrings = (value: AnswerValue): value is string[] => Array.isArray(value) && value.every(item => typeof item === "string");
function fact<T extends AnswerValue>(answers: AssessmentAnswers, id: string, guard: (value: AnswerValue) => value is T): Fact<T> {
  const answer = answers[id];
  if (answer?.status === "known" && guard(answer.value)) return { ...answer, value: answer.value };
  return unknown(answer?.status === "unknown" ? answer.reason : "Not provided");
}
function choice<T extends string>(answers: AssessmentAnswers, id: string, allowed: readonly T[]): Fact<T> {
  return fact(answers, id, (value): value is T => typeof value === "string" && allowed.some(option => option === value));
}
function choices<T extends string>(answers: AssessmentAnswers, id: string, allowed: readonly T[]): Fact<T[]> {
  return fact(answers, id, (value): value is T[] => Array.isArray(value) && value.every(item => allowed.some(option => option === item)));
}
const directions = ["north", "north-east", "east", "south-east", "south", "south-west", "west", "north-west"] as const;
const times = ["morning", "afternoon", "evening", "overnight"] as const;
const extent = ["all", "some", "none"] as const;
const scopeFields = ["energyBasis", "cooling", "coolingKwh", "energyScope", "servesOnlyRoom", "periodStart", "periodEnd"];
export function reviewSignature(draft: AssessmentDraft, kind: "room" | "measuredScope"): string {
  const ids = kind === "room" ? Object.keys(draft.answers) : scopeFields;
  return JSON.stringify(ids.toSorted().map(id => [id, draft.answers[id] ?? null]));
}
export function canConfirmMeasuredScope(draft: AssessmentDraft): boolean {
  const a = draft.answers;
  return a.energyBasis?.status === "known" && a.energyBasis.value === "measured" && a.servesOnlyRoom?.status === "known" && a.servesOnlyRoom.value === true && fact(a, "coolingKwh", isNumber).status === "known" && fact(a, "energyScope", isString).status === "known";
}
export function measuredScopeConfirmed(draft: AssessmentDraft): boolean {
  return canConfirmMeasuredScope(draft) && draft.review?.measuredScope?.signature === reviewSignature(draft, "measuredScope");
}
export function confirmMeasuredScope(draft: AssessmentDraft, recordedAt: string): AssessmentDraft {
  if (!canConfirmMeasuredScope(draft)) return draft;
  return { ...draft, review: { ...draft.review, measuredScope: { signature: reviewSignature(draft, "measuredScope"), recordedAt } } };
}
export function revokeMeasuredScope(draft: AssessmentDraft): AssessmentDraft {
  const review = { ...draft.review };
  delete review.measuredScope;
  return { ...draft, review };
}
export function confirmRoomReview(draft: AssessmentDraft, recordedAt: string): AssessmentDraft {
  return { ...draft, review: { ...draft.review, room: { signature: reviewSignature(draft, "room"), recordedAt } } };
}
export function proposedRoomProfile(draft: AssessmentDraft, recordedAt: string): RoomProfile {
  const a = draft.answers;
  const provenance = { kind: "user-reported" as const, recordedAt, sourceIds: [], scope: "User reviewed the single-bedroom assessment" };
  const equipment = fact(a, "cooling", isStrings);
  const constraints = fact(a, "ventilationConstraints", isString);
  return {
    id: "assessment-bedroom", roomType: recordedAt ? { status: "known", value: "bedroom", provenance } : unknown("Bedroom assessment scope awaiting review"),
    location: fact(a, "location", isString), complaint: unknown("No separate complaint collected"),
    heatTiming: choices<HeatTiming>(a, "heatTiming", times), goal: fact(a, "goal", isString),
    position: choice(a, "position", ["ground-floor", "upper-floor"]), aboveRoom: choice(a, "aboveRoom", ["roof", "another-room", "another-dwelling"]),
    windows: unknown("Individual windows and their pairings have not been recorded"),
    windowSummary: {
      orientations: choices<Direction>(a, "windowOrientation", directions), externalShading: choice(a, "externalShading", extent),
      internalCoverings: fact(a, "internalCoverings", isStrings), opens: choice(a, "windowsOpen", extent),
    },
    insulation: fact(a, "insulation", isBoolean),
    ventilationConstraints: constraints.status === "known" ? { ...constraints, value: [constraints.value] } : constraints,
    cooling: equipment.status === "known" ? { ...equipment, value: {
      equipment: equipment.value.filter((item): item is "fan" | "air-conditioner" => item === "fan" || item === "air-conditioner"),
      modelIdentifier: unknown("Equipment model not supplied"), servesOnlyRoom: fact(a, "servesOnlyRoom", isBoolean),
    } } : equipment,
    budgetAud: fact(a, "budgetAud", isNumber), externalChangesPermitted: fact(a, "externalChangesPermitted", isBoolean), willingToObtainQuotes: fact(a, "willingToObtainQuotes", isBoolean),
    confirmedAt: draft.review?.room?.signature === reviewSignature(draft, "room") ? { status: "known", value: draft.review.room.recordedAt, provenance: { ...provenance, recordedAt: draft.review.room.recordedAt } } : unknown("Room review not confirmed"),
  };
}
export interface BaselineInputRow { label: string; value: string; provenance: string; recordedAt: string | null }
export interface RoomBaseline {
  profile: RoomProfile;
  journey: JourneyState;
  inputs: BaselineInputs | null;
  result: FinancialResult | null;
  kind: "measured" | "scenario" | "unavailable";
  missing: string[];
  noEquipment: boolean;
  scopeConfirmationAvailable: boolean;
  scopeConfirmed: boolean;
  inputRows: BaselineInputRow[];
  arithmetic: string | null;
  periodLabel: string;
}
export const formatMoney = (amount: number): string => new Intl.NumberFormat("en-AU", { style: "currency", currency: "AUD", minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(amount);
export const titleCase = (value: string): string => value.split("-").map(word => word[0]!.toUpperCase() + word.slice(1)).join("-");
export function factText<T>(value: Fact<T>, format: (value: T) => string = value => String(value)): string {
  return value.status === "known" ? format(value.value) : "Not sure";
}
function inputRow(label: string, input: Fact<number | string>, unit = ""): BaselineInputRow {
  return { label, value: factText(input, value => `${value}${unit ? ` ${unit}` : ""}`), provenance: input.status === "unknown" ? "Unknown" : input.provenance.kind === "assumed" ? "Your scenario assumption" : "Reported by you", recordedAt: input.status === "known" ? input.provenance.recordedAt : null };
}
/** This calculation boundary never fills missing power, tariff, energy or attribution. */
export function roomBaseline(draft: AssessmentDraft): RoomBaseline {
  const journey = assessmentJourney(draft);
  const roomReview = draft.review?.room;
  const recordedAt = roomReview?.recordedAt ?? "";
  const profile = proposedRoomProfile(draft, recordedAt);
  if (profile.confirmedAt.status === "known" && roomReview) journey.confirmedProfile = { status: "known", value: profile, provenance: { kind: "user-reported", recordedAt: roomReview.recordedAt, sourceIds: [], scope: "Room answers reviewed by the user" } };
  const noEquipment = profile.cooling.status === "known" && profile.cooling.value.equipment.length === 0;
  let inputs = journey.baselineInputs.status === "known" ? journey.baselineInputs.value : null;
  const scopeConfirmed = measuredScopeConfirmed(draft);
  const scopeConfirmationAvailable = canConfirmMeasuredScope(draft);
  const inputRows: BaselineInputRow[] = [];
  let periodLabel = "Period · Not sure";
  let arithmetic: string | null = null;
  if (inputs) {
    if (inputs.energy.kind === "electrical-input-scenario" && inputs.period.status === "unknown" && inputs.energy.coolingDays.status === "known") {
      // A supplied number of cooling days is a stated scenario period, never calendar dates or an annual schedule.
      const days = inputs.energy.coolingDays;
      inputs = { ...inputs, period: { status: "known", value: { kind: "cooling-schedule", coolingDays: days.value, basis: "stated-period", description: `${days.value} user-entered cooling days; calendar dates not supplied` }, provenance: days.provenance } };
    }
    if (inputs.energy.kind === "measured" && scopeConfirmed && draft.review?.measuredScope) {
      inputs = { ...inputs, bedroomAttribution: { status: "known", value: { description: "User confirmed the measurement covers only cooling equipment serving this bedroom", sourceIds: [] }, provenance: { kind: "user-reported", recordedAt: draft.review.measuredScope.recordedAt, sourceIds: [], scope: "Explicit confirmation of bedroom-only cooling measurement scope" } } };
    }
    if (inputs.period.status === "known") {
      const period = inputs.period.value;
      periodLabel = period.kind === "date-range" ? `${period.start} to ${period.end}` : `${period.coolingDays} cooling days · ${period.description}`;
    }
    const energy = inputs.energy;
    if (energy.kind === "measured") {
      inputRows.push(inputRow("Cooling-specific measured energy", energy.coolingKwh, "kWh"), inputRow("Measurement covers", fact(draft.answers, "energyScope", isString)), inputRow("Period start", fact(draft.answers, "periodStart", isString)), inputRow("Period end", fact(draft.answers, "periodEnd", isString)));
    } else {
      inputRows.push(inputRow("Average electrical input", energy.averageElectricalInputKw, "kW"), inputRow("Operating time", energy.hoursPerDay, "hours per cooling day"), inputRow("Cooling days", energy.coolingDays, "days"));
    }
    inputRows.push(inputRow("Flat electricity usage rate", inputs.flatTariffAudPerKwh, "AUD/kWh"));
    const result = calculateCoolingCost(inputs, energy.kind === "electrical-input-scenario" ? "supplied-scenario" : "bedroom");
    journey.baselineInputs = { ...journey.baselineInputs, status: "known", value: inputs, provenance: journey.baselineInputs.status === "known" ? journey.baselineInputs.provenance : { kind: "user-reported", recordedAt, sourceIds: [], scope: "Baseline inputs reviewed" } };
    journey.currentCoolingCost = { status: "known", value: result, provenance: result.amountAud.status === "known" ? result.amountAud.provenance : journey.baselineInputs.provenance };
    if (result.amountAud.status === "known" && typeof result.amountAud.value === "number") {
      const rate = inputs.flatTariffAudPerKwh;
      if (energy.kind === "measured" && energy.coolingKwh.status === "known" && rate.status === "known") arithmetic = `${energy.coolingKwh.value} kWh × ${rate.value} AUD/kWh = ${formatMoney(result.amountAud.value)}`;
      if (energy.kind === "electrical-input-scenario" && energy.averageElectricalInputKw.status === "known" && energy.hoursPerDay.status === "known" && energy.coolingDays.status === "known" && rate.status === "known") arithmetic = `${energy.averageElectricalInputKw.value} kW × ${energy.hoursPerDay.value} h/day × ${energy.coolingDays.value} days × ${rate.value} AUD/kWh = ${formatMoney(result.amountAud.value)}`;
    }
    const missing = result.status === "insufficient-evidence" ? result.limitations.filter(text => !text.startsWith("Excludes") && !text.startsWith("Does not") && !text.startsWith("Cost of the supplied")) : [];
    return { profile, journey, inputs, result, kind: energy.kind === "measured" ? "measured" : "scenario", missing, noEquipment, scopeConfirmationAvailable, scopeConfirmed, inputRows, arithmetic, periodLabel };
  }
  return { profile, journey, inputs: null, result: null, kind: "unavailable", missing: noEquipment ? [] : ["Cooling-specific measured kWh, or an explicitly assumed electrical-input scenario.", "A flat electricity usage rate in AUD/kWh.", "The measured date range, or the scenario’s operating hours and cooling days."], noEquipment, scopeConfirmationAvailable, scopeConfirmed, inputRows, arithmetic, periodLabel };
}
