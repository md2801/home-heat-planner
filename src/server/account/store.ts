import { isAssessmentDraft, type AssessmentDraft } from "../../features/assessment/state.ts";
import { safeJson } from "../../domain/history.ts";
import type { JourneyQuery } from "../journey/postgres.ts";

export interface AccountJourney { draft: AssessmentDraft | null; revision: number }
const draftKeys = new Set(["schemaVersion", "answers", "currentQuestionId", "completed", "sceneDetails", "review", "replacement", "shadingScenario", "coolingPlanDraft", "followUpCheckIn", "history", "selectedTechniques", "selectedOption"]);
export function validAccountDraft(value: unknown): value is AssessmentDraft {
  return isAssessmentDraft(value) && safeJson(value) && Object.keys(value).every(key => draftKeys.has(key));
}
export function createAccountStore(query: JourneyQuery) {
  return {
    async load(userId: string): Promise<AccountJourney> {
      const rows = await query("SELECT draft::text AS body, revision FROM heat_planner_account_journeys WHERE user_id = $1", [userId]);
      if (!rows[0]) return { draft: null, revision: 0 };
      const draft: unknown = JSON.parse(String(rows[0].body));
      const revision = Number(rows[0].revision);
      if (!validAccountDraft(draft) || !Number.isSafeInteger(revision) || revision < 1) throw new Error("Invalid saved account journey");
      return { draft, revision };
    },
    async save(userId: string, draft: AssessmentDraft, revision: number): Promise<number | null> {
      if (!validAccountDraft(draft) || !Number.isSafeInteger(revision) || revision < 0) throw new Error("Invalid account journey");
      const rows = revision === 0
        ? await query("INSERT INTO heat_planner_account_journeys (user_id, draft) VALUES ($1, $2::json) ON CONFLICT (user_id) DO NOTHING RETURNING revision", [userId, JSON.stringify(draft)])
        : await query("UPDATE heat_planner_account_journeys SET draft = $2::json, revision = revision + 1, updated_at = now() WHERE user_id = $1 AND revision = $3 RETURNING revision", [userId, JSON.stringify(draft), revision]);
      return rows[0] ? Number(rows[0].revision) : null;
    },
  };
}
