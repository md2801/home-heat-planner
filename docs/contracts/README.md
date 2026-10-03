# Journey contracts v1

Canonical DTOs: `src/contracts/journey.ts`, `src/contracts/intake.ts`, `src/domain/models.ts`, `src/domain/cooling-plan.ts`, `src/domain/follow-up.ts`. Runtime guards: `src/contracts/validation.ts`, `src/contracts/intake.ts`, `src/domain/value-guards.ts`. JSON request schema: [planner-request.schema.json](planner-request.schema.json). Active branches, dates, applicability and snapshot association also require domain guards.

## Calculation API

`POST /api/planner`, JSON byte limit 128,000, schemaVersion 1. Operation: assess, confirm, recommend, compare. Returns a recomputed view; confirm also returns room-review confirmation. No database write. HTTP adapter timeout 15 seconds; response no-store.

Valid unknown-path request:

```json
{"schemaVersion":1,"operation":"assess","assessment":{"answers":{}}}
```

Explicit unknown clarification: `{"status":"unknown","reason":"User selected Not sure"}` in an answers entry. Absence means unanswered. Known answer example:

```json
{"status":"known","value":["afternoon"],"provenance":{"kind":"user-reported","recordedAt":"2026-10-03T01:00:00Z","sourceIds":[],"scope":"Bedroom assessment: heatTiming"}}
```

Zero/false are valid where allowed. Empty strings are not zero. Only known question IDs, appropriate value types and active measured/scenario branch fields are accepted. Optional review has room/measuredScope signature/date records. Optional replacement has bounded raw strings, boolean confirmations and update timestamp; incomplete inputs remain unavailable calculations.

DTO excludes UI cursor/completion, selection, plan, check-in, history and storage keys. assessmentInput projects state; calculationDraft reconstructs an internal calculation state.

Success: `{ok:true,data:{profile,currentCoolingCost,recommendations,comparisons,missingInformation,review}}`; currentCoolingCost is FinancialResult or null. Failure: `{ok:false,error:{code,message,retryable}}`; code invalid-input/unavailable. Invalid JSON/shape: 400; oversize: 413. HTTP adapter validates nested output and preserves local answers on errors. Working local/HTTP adapters share the engine; room confirmation calls plannerClient.execute and page projections reuse pure domain logic. Storage is a separate boundary.

## Values and units

Fact<T>: unknown status/reason or known status/value/provenance. Provenance: kind, timestamp, sourceIds, scope. Currency AUD; energy kWh; electrical input/rated cooling output separately labelled kW; tariff AUD/kWh; hours/day; payback years. Ranges: min/max. FinancialResult preserves supported-estimate/what-if/insufficient-evidence status, currency, period, methodVersion, inputProvenance, assumptions, sourceIds, limitations. Period distinguishes date-range, cooling-schedule, standardised-year. Short date ranges are not annual savings.

## Plan and check-in persistence

PlanSaveRequest `{assessmentId,plan:CoolingPlanDraft}` and CheckInSaveRequest `{assessmentId,checkIn:FollowUpCheckIn}` use actual snapshots, checklist/date, provenance, association and save timestamps. SaveResponse `{saved,scope:"browser"|"server"}` makes scope explicit. These are adapter contracts, **not implemented server endpoints**. Current repositories save locally and validate plan/assessment association. No backend success is fabricated.

Follow-up states: not-started, started, completed, stuck, deferred. Optional completed observations: cost AUD, completion local YYYY-MM-DD, hours/day, kWh, tariff, measurement period/scope/weather description, comfort rating 1–5 and time. Barriers: cost, permission, installation, time, uncertainty, did-not-help. Baseline comfort is retained in the saved plan. Missing values stay unknown; interpretation observational.

Historical snapshots retain estimates/sources/check-ins. Material changes archive before invalidating selection. Bounds: 50 history entries, 50 retained check-ins/entry. Clear assessment deletes local history.

## Optional intake

`POST /api/intake`, byte limit 5,000: `{complaint,allowedQuestionIds}`. Complaint 1–500 chars; known unique IDs, bounded by the current question set. Success `{ok:true,suggestion:{category,questionId}}`; category timing/shade/roof/cooling/unclear. Unexpected keys/disallowed questions rejected. Failure `{ok:false,message}` offers manual continuation. Same-origin browser requests checked. No extracted fact/numeric estimate/diagnosis enters room state. README documents demo guards and default-off production assistance. Voice/CV/Jev endpoints are not implemented.

## Financial brief

POST /api/financial-brief accepts {command: PlannerCommand, focus: "understand" | "budget" | "next-step"}, with a 128,000-byte body limit and same-origin guard. Server recomputes calculator-owned explanation cards from validated assessment inputs. Only those summaries, limitations and checks (not raw complaints, location or quote identities) are sent to OpenAI gpt-6-luna using structured Responses output and store:false. The response is {ok:true,ids:string[]} or {ok:false,message?:string}. IDs must be unique, drawn from current cards and number one to three. The model chooses reading order, never wording, numerical values or installation ranking. The browser resolves IDs to locally computed cards; context changes reset the brief and cancel stale requests. No brief is persisted.

A local summary remains available without the provider. Calls are explicit, cached for five minutes (100 entries), limited to three/client/minute and 30/process, with 1,200 output tokens and an 18-second timeout. These are local demo limits, not distributed spend measurement; the existing hosted usage-control guard applies. A quote does not supply a missing intervention-effect method.

API reference: https://developers.openai.com/api/docs/guides/structured-outputs

## Individual window directions

Known counts of one to four activate window1Orientation through window4Orientation immediately after windowCount. Each is a single compass direction or explicit unknown; unused window answers are pruned when count changes. Zero windows skips window questions. Unknown counts and more-than-four retain the aggregate windowOrientation question. Legacy aggregate answers remain readable, but do not assign mixed directions to individual windows. Confirming a room scene also updates these individual answers. New individual answers take precedence over legacy summaries and scene directions.

## Cooling equipment details

After cooling, fanType is active for fans and portableFanPosition for portable/both fans. acType is active for AC; acWall is active for wall-mounted/window-mounted units. Each permits an explicit unknown. Branch changes prune incompatible details. All four travel as validated user-reported assessment answers, with their own provenance scopes. Positions are schematic labels/placements; no power, performance or savings are inferred. Existing completed drafts resume missing active questions without losing answers. The bounded room-scene DTO still describes equipment categories; precise placement stays in assessment answers and is applied by deterministic rendering.
