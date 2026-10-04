# Anonymous server journey persistence

The five routes compose the existing DTOs in `src/contracts/journey.ts`, `CoolingPlanDraft`, `FollowUpCheckIn` and `PlanHistoryEntry`. Shared DTOs, frontend components and the renderer are unchanged. `src/server/journey/` separates HTTP handling, validation, persistence logic and parameterised SQL. No AI or new financial method runs here. Existing deterministic projections validate submitted plan snapshots; successful saves retain the submitted figures, unknowns, evidence and provenance unchanged.

## Storage setup

1. Connect a Neon Postgres database through the [Vercel Marketplace](https://vercel.com/docs/marketplace-storage). The [Neon HTTP driver](https://github.com/neondatabase/serverless) supports Vercel functions without keeping a process-local database connection.
2. Set server-only pooled `DATABASE_URL` in Vercel and locally in the ignored `.env.local`. Set the direct connection as `DATABASE_URL_UNPOOLED` for migrations. Never use a `NEXT_PUBLIC_` variable. The checked-in `.env.example` contains variable names only.
3. Apply `db/migrations/001_journeys.sql` once using a migration-capable database role, or run:

   ```sh
   node --env-file-if-exists=.env.local --experimental-strip-types scripts/migrate-journeys.ts
   ```

4. The migration script prefers `DATABASE_URL_UNPOOLED`; an existing direct `DATABASE_URL` remains supported, while pooled migration URLs are rejected. Validate migrations on an isolated Neon branch before applying to the app branch. The runtime database role needs SELECT, INSERT, UPDATE and DELETE on `heat_planner_journeys`. No runtime DDL, local filesystem database or in-memory fallback is used. Missing configuration or database failure returns 503; no successful server save is fabricated.

Each row contains the assessment and complete journey document. PostgreSQL `json` deliberately preserves property order because existing immutable snapshot guards compare JSON serialization. Changing this column to `jsonb` would reorder keys and break those guards. Database revision checks make updates atomic across concurrent Vercel invocations. A bounded retry rereads and revalidates after a conflicting write. Deletion cannot be undone by an in-flight stale writer.

There is no expiration. The current plan retains up to 50 check-in versions; up to 50 archived plans each retain their observations. Oldest entries beyond these existing journey bounds are removed. DELETE removes the row and its entire retained history; provider backups follow the database provider's retention policy.

## Access and HTTP behaviour

Creation generates a random UUID and a separate 256-bit cryptographic access token. Only its SHA-256 digest is stored. The raw token is returned **once**, in the create response. Clients must retain it to restore or change the journey. There are no user accounts, token recovery or cookies. Losing the token loses access. The frontend can keep its existing browser journey while deciding where to retain this capability.

Every later operation requires `Authorization: Bearer <accessToken>`. Tokens in query strings, assessment IDs, cookies or request bodies do not grant access. Missing/malformed credentials return 401; a wrong token and a nonexistent assessment return the same 404. Every database read, update and delete filters by ID **and** token digest. Access tokens, database diagnostics and journey payloads are never logged by these endpoints.

All responses, including errors, carry `Cache-Control: private, no-store`, `Vary: Authorization` and `Referrer-Policy: no-referrer`. Browser requests with an Origin must match the application's origin; non-browser clients may omit Origin. Write bodies require `application/json` and have a streaming 128,000-byte limit. Other methods use Next.js's standard 405 response.

| Operation | Request | Success |
| --- | --- | --- |
| `POST /api/assessments` | `JourneyInput` `{schemaVersion:1,assessment:AssessmentInput}` | 201: `SaveResponse` plus `assessmentId`, `accessToken` |
| `GET /api/assessments/:id` | Bearer token | 200: `assessmentId`, `assessment`, `selection`, `plan`, `followUp`, `checkIns`, `history` |
| `PUT /api/assessments/:id/plan` | Bearer token + `PlanSaveRequest` `{assessmentId,plan}` | 200: `{saved:true,scope:"server"}` |
| `POST /api/assessments/:id/check-ins` | Bearer token + `CheckInSaveRequest` `{assessmentId,checkIn}` | 200: `{saved:true,scope:"server"}` |
| `DELETE /api/assessments/:id` | Bearer token | 200: `{saved:true,scope:"server"}` |

To replace assessment inputs without changing `JourneyInput`, use `POST /api/assessments?assessmentId=:id` with the same body and Bearer token. Success is 200 and returns the existing ID without reissuing its token. Material changes archive the previous plan and its check-ins, then clear the current plan and selection. Unrelated changes preserve those snapshots. This query parameter identifies the assessment; it never carries a credential.

Restore uses `AssessmentInput` for room answers, review, replacement inputs and confirmed scene details. `selection` composes the existing `AssessmentDraft.selectedOption` and `selectedTechniques` properties, recovered from the plan's existing selection signature. `plan` and `followUp` are null until saved. `checkIns` contains retained observation versions; `followUp` is the latest by observation timestamp. `history` contains existing `PlanHistoryEntry` records. UI cursors, completion flags and browser storage keys are not transported.

## Validation and plan associations

Assessment validation reuses `isPlannerCommand`, `isAssessmentDraft`, question/branch/value/provenance guards and confirmed-scene validation. Supplied room and measured-scope confirmations must match the current review signature. Stale confirmations are rejected rather than promoted to known facts. Absent answers remain absent, explicit unknowns remain unknown, individual windows retain their pairing, and known zero/false remain distinct from missing values.

Plan validation recovers the selected investigation and/or techniques from `CoolingPlanDraft.selectionSignature`, validates them against the saved assessment's material signature and eligibility, then uses `isPlanForSelection` and `canSavePlan`. Immutable checklist descriptions, snapshots, catalogue versions and evidence must match the existing domain projection. Completed flags and dates may change. Unsupported figures or altered source metadata are rejected. Submissions must already have a known `savedAt` fact, using the existing domain save helper.

The DTO's legacy `savedAt.provenance.scope` wording (“Plan saved in this browser”) is preserved because the current domain guard requires it; it describes the submitted snapshot. The API receipt's `scope:"server"` is the explicit confirmation of durable server persistence. No shared guard or provenance scope is silently changed.

A different plan ID archives the current plan. An archived plan identity cannot be reused. Updates to the same plan ID preserve its creation timestamp, selection, evidence, financial snapshot and baseline observations; only checklist completion, check-in choice/date, update and save timestamps may change. Older updates or conflicting values at the same update timestamp return 409.

Check-ins require a current saved plan and are validated with `isCheckInForPlan`: plan ID, action ID/label, plan signature and earlier observations must match. Completed costs and use remain self-reported observations; interpretation must be `observational`. Submitting to an archived, removed or unrelated plan returns 409. Earlier saved observations remain associated with their archived plan. The existing domain helper uses one check-in ID per plan; retained versions are identified by ID plus updatedAt. Identical retries are idempotent, while differing observations with the same version return 409. No write changes the plan's financial figures.

Errors use `{ok:false,error:{code,message,retryable}}`. Statuses: 400 invalid shape/domain values; 401 missing/malformed token; 403 cross-origin browser request; 404 absent/inaccessible journey; 409 stale association/version or repeated write conflict; 413 oversized body; 415 wrong media type; 503 storage unavailable. A 409 requires restoring and reconciling state before retrying. Keep local progress on errors.

## Examples

These are illustrative user reports, not real home measurements or financial claims. Full, valid payloads are checked in under [journey-examples](journey-examples/). The assessment includes two different windows, an explicitly unknown direction and insulation, distinct confirmed coverings/shade and a room review. The plan is an insulation investigation with unknown cost and savings; the completed check-in reports a user-entered zero cost without claiming a cooling benefit.

```sh
curl -X POST http://localhost:3000/api/assessments \
  -H 'Content-Type: application/json' \
  --data-binary @docs/contracts/journey-examples/assessment-request.json
```

Example creation response (the token here is a placeholder):

```json
{"saved":true,"scope":"server","assessmentId":"11111111-1111-4111-8111-111111111111","accessToken":"<retain-the-generated-token>"}
```

Use the returned ID in the URL **and** the assessmentId property of the plan/check-in example files. Set `$ASSESSMENT_ID` and `$ACCESS_TOKEN` in your shell, then:

```sh
curl -X PUT "http://localhost:3000/api/assessments/$ASSESSMENT_ID/plan" \
  -H "Authorization: Bearer $ACCESS_TOKEN" -H 'Content-Type: application/json' \
  --data-binary @docs/contracts/journey-examples/plan-request.json

curl -X POST "http://localhost:3000/api/assessments/$ASSESSMENT_ID/check-ins" \
  -H "Authorization: Bearer $ACCESS_TOKEN" -H 'Content-Type: application/json' \
  --data-binary @docs/contracts/journey-examples/check-in-request.json

curl "http://localhost:3000/api/assessments/$ASSESSMENT_ID" \
  -H "Authorization: Bearer $ACCESS_TOKEN"

curl -X DELETE "http://localhost:3000/api/assessments/$ASSESSMENT_ID" \
  -H "Authorization: Bearer $ACCESS_TOKEN"
```

Every successful mutation returns `{saved:true,scope:"server"}`. See [restore-response.json](journey-examples/restore-response.json) for the full restore payload. ID-only access returns:

```json
{"ok":false,"error":{"code":"unauthorized","message":"An assessment access token is required.","retryable":false}}
```

## Integration checks

```sh
node --experimental-strip-types --test tests/journey-persistence.test.ts
npm test
npm run typecheck
npm run lint
npm run build
```

Local integration tests exercise the production HTTP handlers, service, SQL adapter and actual migration against PGlite's PostgreSQL engine. They cover isolation for every operation, exact DTO/window/provenance round trips, corrupted inputs, original snapshots, simple/combined selections, archived associations, retries, concurrent observations, stale writers after deletion, request limits and safe storage failure responses. PGlite is a test-only dependency and is never used by Vercel routes.

For a hosted-driver smoke test, create a separate Neon test database, apply the migration there, then set `JOURNEY_TEST_DATABASE_URL` and run:

```sh
node --env-file-if-exists=.env.local --experimental-strip-types --test tests/journey-neon.test.ts
```

This explicit test URL prevents accidental writes to the app's production database. The test creates a random journey and removes it in finally. It skips when the test URL is absent. Frontend wiring and deployment/database provisioning are separate work.
