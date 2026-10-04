import type { JourneyStore, SavedJourney } from "./types.ts";
import { isJourneyInput } from "./validation.ts";
import { record } from "../../domain/value-guards.ts";
import { safeJson, isHistory } from "../../domain/history.ts";

/** Parameterised SQL boundary also used by the PostgreSQL integration tests. */
export type JourneyQuery = (text: string, parameters: unknown[]) => Promise<Record<string, unknown>[]>;
export function createPostgresJourneyStore(query: JourneyQuery): JourneyStore {
  return {
    async create(id, hash, document) {
      await query("INSERT INTO heat_planner_journeys (id, access_token_hash, document) VALUES ($1::uuid, $2, $3::json)", [id, hash, JSON.stringify(document)]);
    },
    async read(id, hash) {
      const rows = await query("SELECT document::text AS body, revision FROM heat_planner_journeys WHERE id = $1::uuid AND access_token_hash = $2", [id, hash]);
      const row = rows[0];
      if (!row) return null;
      const document: unknown = typeof row.body === "string" ? JSON.parse(row.body) : null;
      if (!record(document) || !safeJson(document) || !isJourneyInput({ schemaVersion: 1, assessment: document.assessment }) || !record(document.selection) || !Array.isArray(document.checkIns) || !isHistory(document.history) || !(document.plan === null || record(document.plan)) || !(document.followUp === null || record(document.followUp)) || typeof row.revision !== "number" || !Number.isInteger(row.revision)) throw new Error("Invalid stored journey");
      return { document: document as unknown as SavedJourney, revision: row.revision };
    },
    async replace(id, hash, revision, document) {
      const rows = await query("UPDATE heat_planner_journeys SET document = $4::json, revision = revision + 1, updated_at = now() WHERE id = $1::uuid AND access_token_hash = $2 AND revision = $3 RETURNING id", [id, hash, revision, JSON.stringify(document)]);
      return rows.length === 1;
    },
    async remove(id, hash) {
      const rows = await query("DELETE FROM heat_planner_journeys WHERE id = $1::uuid AND access_token_hash = $2 RETURNING id", [id, hash]);
      return rows.length === 1;
    },
  };
}
