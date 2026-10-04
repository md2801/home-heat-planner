import assert from "node:assert/strict";
import test from "node:test";
import { neon } from "@neondatabase/serverless";
import { createPostgresJourneyStore } from "../src/server/journey/postgres.ts";
import { createJourneyService } from "../src/server/journey/service.ts";
import { assessmentInput } from "../src/contracts/journey.ts";
import { journeyFixture } from "./helpers/journey-fixture.ts";

// Explicit test URL only: never silently write to the application's production database.
const connection = process.env.JOURNEY_TEST_DATABASE_URL;
test("hosted Neon round trip and deletion", { skip: !connection }, async () => {
  const sql = neon(connection!, { fetchOptions: { signal: AbortSignal.timeout(20000) } });
  const makeService = () => createJourneyService(createPostgresJourneyStore((text, parameters) => sql.query(text, parameters)));
  const fixture = journeyFixture();
  const input = { schemaVersion: 1 as const, assessment: assessmentInput(fixture.draft) };
  const service = makeService();
  const { assessmentId: id, accessToken: token } = await service.create(input);
  assert.ok(token);
  try {
    await service.savePlan(id, token, { assessmentId: id, plan: fixture.plan });
    await service.saveCheckIn(id, token, { assessmentId: id, checkIn: fixture.checkIn });
    const restored = await makeService().restore(id, token);
    assert.deepEqual(restored.assessment, input.assessment);
    assert.deepEqual(restored.plan, fixture.plan);
    assert.deepEqual(restored.followUp, fixture.checkIn);
  } finally { await service.clear(id, token); }
  await assert.rejects(makeService().restore(id, token));
});
