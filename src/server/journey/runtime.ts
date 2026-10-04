import { neon } from "@neondatabase/serverless";
import { createPostgresJourneyStore } from "./postgres.ts";
import { createJourneyService, JourneyError } from "./service.ts";

export function journeyService() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new JourneyError(503, "unavailable", "Journey saving is unavailable. Keep your local progress and retry later.");
  const sql = neon(url, { fetchOptions: { signal: AbortSignal.timeout(10000) } });
  return createJourneyService(createPostgresJourneyStore((text, parameters) => sql.query(text, parameters)));
}
