/** Explicit unknowns are distinct from missing DTO fields, false and numeric zero. */
export type Fact<T> =
  | { status: "unknown"; reason: string }
  | { status: "known"; value: T; provenance: Provenance };

export interface Provenance {
  kind: "measured" | "sourced" | "user-reported" | "assumed";
  recordedAt: string;
  sourceIds: string[];
  scope: string;
}

export interface EvidenceSource {
  id: string;
  title: string;
  url: string;
  excerpt: string;
  reviewedAt: string;
  contentVersion: string;
}

export interface Assumption { id: string; description: string; provenance: Provenance }
export type EstimateStatus = "supported-estimate" | "what-if" | "insufficient-evidence";
export type NumericRange = { min: number; max: number };
export type Period =
  | { kind: "standardised-year"; basis: "annual"; description: string }
  | { kind: "date-range"; start: string; end: string }
  | { kind: "cooling-schedule"; coolingDays: number; basis: "stated-period" | "annual"; description: string };
export type HeatTiming = "morning" | "afternoon" | "evening" | "overnight";
export type Direction = "north" | "north-east" | "east" | "south-east" | "south" | "south-west" | "west" | "north-west";

export interface WindowProfile {
  id: string;
  orientation: Fact<Direction>;
  externalShading: Fact<boolean>;
  internalCoverings: Fact<string>;
  opens: Fact<boolean>;
}

/** Room-wide reports do not establish the number or pairing of individual windows. */
export interface WindowSummary {
  orientations: Fact<Direction[]>;
  externalShading: Fact<"all" | "some" | "none">;
  internalCoverings: Fact<string[]>;
  opens: Fact<"all" | "some" | "none">;
}

export interface RoomProfile {
  id: string;
  location: Fact<string>;
  roomType: Fact<"bedroom">;
  complaint: Fact<string>;
  heatTiming: Fact<HeatTiming[]>;
  goal: Fact<string>;
  position: Fact<"ground-floor" | "upper-floor">;
  aboveRoom: Fact<"roof" | "another-dwelling" | "another-room">;
  windows: Fact<WindowProfile[]>;
  windowSummary?: WindowSummary;
  insulation: Fact<boolean>;
  ventilationConstraints: Fact<string[]>;
  cooling: Fact<{ equipment: ("fan" | "air-conditioner")[]; modelIdentifier: Fact<string>; servesOnlyRoom: Fact<boolean> }>;
  budgetAud: Fact<number | NumericRange>;
  externalChangesPermitted: Fact<boolean>;
  willingToObtainQuotes: Fact<boolean>;
  confirmedAt: Fact<string>;
}

export type EnergyUse =
  | { kind: "measured"; coolingKwh: Fact<number> }
  | { kind: "electrical-input-scenario"; averageElectricalInputKw: Fact<number>; hoursPerDay: Fact<number>; coolingDays: Fact<number> };

export interface BaselineInputs {
  energy: EnergyUse;
  flatTariffAudPerKwh: Fact<number>;
  period: Fact<Period>;
  bedroomAttribution: Fact<{ description: string; sourceIds: string[] }>;
}

export interface FinancialResult {
  status: EstimateStatus;
  amountAud: Fact<number | NumericRange>;
  currency: "AUD";
  period: Fact<Period>;
  methodVersion: string;
  inputProvenance: Provenance[];
  assumptions: Assumption[];
  sourceIds: string[];
  limitations: string[];
}

export interface Recommendation {
  id: string;
  actionId: string;
  description: string;
  eligibility: "eligible" | "ineligible" | "needs-information";
  requiredChecks: string[];
  factIds: string[];
  sourceIds: string[];
  comfortTradeOffs: string[];
  upfrontCostAud: Fact<number | NumericRange>;
  costScope: Fact<string>;
  catalogueVersion: string;
}

export interface Comparison {
  optionId: string;
  baseline: FinancialResult;
  proposed: FinancialResult;
  annualNetSavings: FinancialResult;
  /** Electricity-cost difference over the stated scenario period; never an annualised saving. */
  periodSavings?: FinancialResult;
  /** Electricity-use difference over the same period as periodSavings. */
  energySavingsKwh?: Fact<number>;
  simplePaybackYears: Fact<number | NumericRange>;
  assumptions: Assumption[];
}

export interface ChecklistStep { id: string; description: string; completed: boolean }
export type PlanStatus = "planned" | "started" | "completed" | "deferred";
export interface CoolingPlan {
  id: string;
  selectedActionId: string;
  comparisonSnapshot: Fact<Comparison>;
  checklist: ChecklistStep[];
  checkInDate: Fact<string>;
  status: PlanStatus;
}

export interface ComfortRecord {
  rating: Fact<1 | 2 | 3 | 4 | 5>;
  timeOfDay: Fact<HeatTiming>;
  coolingUse: Fact<string>;
}

export interface FollowUp {
  id: string;
  planId: string;
  status: PlanStatus;
  stuck: boolean;
  barrier: Fact<"cost" | "permission" | "installation" | "time" | "uncertainty" | "did-not-help">;
  actualCostAud: Fact<number>;
  completionDate: Fact<string>;
  laterUsage: Fact<BaselineInputs>;
  comfort: Fact<ComfortRecord>;
  recordedAt: string;
  interpretation: "observational";
}

export type AnswerValue = string | number | boolean | string[];
export interface AssessmentAnswers { [questionId: string]: Fact<AnswerValue> }
export interface ClarificationAnswer { questionId: string; answer: Fact<AnswerValue> }

export interface JourneyState {
  schemaVersion: 1;
  assessmentAnswers: AssessmentAnswers;
  clarificationAnswers: ClarificationAnswer[];
  confirmedProfile: Fact<RoomProfile>;
  unknownFields: string[];
  baselineInputs: Fact<BaselineInputs>;
  currentCoolingCost: Fact<FinancialResult>;
  recommendations: Recommendation[];
  comparisons: Comparison[];
  selectedActionId: Fact<string>;
  plan: Fact<CoolingPlan>;
  baselineComfort: Fact<ComfortRecord>;
  followUps: FollowUp[];
}
