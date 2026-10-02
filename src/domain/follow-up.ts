import type { Fact } from "./models.ts";

export type FollowUpStatus = "not-started" | "started" | "completed" | "stuck" | "deferred";
export type Barrier = "cost" | "permission" | "installation" | "time" | "uncertainty" | "did-not-help";
/** Optional observations, never attributed intervention outcomes. */
export interface FollowUpCheckIn {
  schemaVersion: 1;
  id: string;
  planId: string;
  actionId: string;
  actionLabel: string;
  planSignature: string;
  status: Fact<FollowUpStatus>;
  actualCostAud: Fact<number>;
  currentHoursPerDay: Fact<number>;
  comfortRating: Fact<1 | 2 | 3 | 4 | 5>;
  note: Fact<string>;
  completionDate?: Fact<string>;
  barrier?: Fact<Barrier>;
  comfortTime?: Fact<string>;
  earlierComfort?: Fact<number>;
  earlierComfortTime?: Fact<string>;
  laterCoolingKwh?: Fact<number>;
  laterTariff?: Fact<number>;
  usagePeriod?: Fact<string>;
  earlierHoursPerDay: Fact<number>;
  comparableUsageConfirmed: Fact<boolean>;
  createdAt: string;
  updatedAt: string;
  savedAt: Fact<string>;
  interpretation: "observational";
}
